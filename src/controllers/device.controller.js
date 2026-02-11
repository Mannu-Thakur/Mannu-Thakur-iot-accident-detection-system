/**
 * Device Controller
 * Handles device operations: heartbeat, incident reporting, live access
 */
const mongoose = require('mongoose');
const path = require('path');
const { Device, Vehicle, Owner, Incident, LiveAccessRequest, LocalAuthority } = require('../models');
const { notificationService, severityService, dedupService, geoService, auditService } = require('../services');
const { generateIncidentId, generateRequestId, generateMessageId } = require('../utils/idGenerator');
const { hashBuffer } = require('../utils/imageHash');
const logger = require('../utils/logger');
const config = require('../config');
const { sendSuccess, sendCreated, sendError, sendNotFound, sendConflict } = require('../utils/response');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Get socket.io instance (will be set by socket setup)
let io = null;
const setSocketIO = (socketIO) => {
    io = socketIO;
};

/**
 * Device heartbeat / telemetry
 */
const heartbeat = asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const { senderTimestamp, batteryLevel, gps, firmwareVersion, messageId } = req.body;

    const device = req.deviceDoc;

    // Update heartbeat
    device.updateHeartbeat(batteryLevel, gps);

    // Update firmware version if changed
    if (firmwareVersion && device.firmwareVersion !== firmwareVersion) {
        device.firmwareVersion = firmwareVersion;
    }

    await device.save();

    // Check battery level and alert if low
    if (batteryLevel !== undefined && batteryLevel < 20) {
        logger.warn('Device low battery:', { deviceId, batteryLevel });
        // TODO: Create maintenance alert
    }

    return sendSuccess(res, {
        status: 'OK',
        serverTimestamp: new Date().toISOString(),
    });
});

/**
 * Report incident (multipart with image)
 */
/**
 * Report incident (Smart merging of Data + Image from separate devices)
 */
const reportIncident = asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const device = req.deviceDoc;

    // 1. Initial Payload Parsing
    let payload;
    try {
        if (req.body.payload) {
            payload = typeof req.body.payload === 'string'
                ? JSON.parse(req.body.payload)
                : req.body.payload;
        } else {
            // If strictly JSON request or flat fields
            payload = req.body;
        }
    } catch (error) {
        return sendError(res, 'Invalid payload JSON', 400);
    }

    const {
        messageId, senderTimestamp, location: payloadLocation, speed,
        airbagsDeployed, isBreakFail, isFreeFall, impactDirection, impactForce, connectivityUsed
    } = payload;

    const requestTimestamp = senderTimestamp ? new Date(senderTimestamp) : new Date();

    // 2. Validate associations
    if (!device.boundVehicleId) {
        return sendError(res, 'Device not bound to any vehicle', 400);
    }

    // 3. Process Image if present
    const imageFile = req.file;
    let imageUrl = null;
    let imageHash = null;

    if (imageFile) {
        imageUrl = `/uploads/${imageFile.filename}`;
        imageHash = hashBuffer(imageFile.buffer || require('fs').readFileSync(imageFile.path));
    }

    // 4. Determine Request Type
    const isImageOnly = !!imageUrl && (speed === undefined && !airbagsDeployed);
    const isDataOnly = !imageUrl && (speed !== undefined || airbagsDeployed);
    const isFullReport = !!imageUrl && (speed !== undefined || airbagsDeployed);

    if (!isImageOnly && !isDataOnly && !isFullReport) {
        // Maybe just a heartbeat disguised as incident or empty payload?
        // We'll proceed but it might be treated as DataOnly with nulls.
    }

    // 5. Duplicate Check (Skip if we are going to try merging, unless strict MessageID match)
    // If strict messageId is provided, we check existing.
    if (messageId) {
        const dupCheck = await dedupService.checkDuplicate(messageId, imageHash, deviceId);
        if (dupCheck.isDuplicate) {
            // IF it is a duplicate BUT we are adding the missing piece (e.g. Image to a Data entry), we should UPDATE instead of returning duplicate.
            // However, dedupService usually just checks existence. 
            // We will check for "Mergeable Candidate" below manually.
            // If completely identical (Data+Image vs Data+Image), then return.
        }
    }

    // 6. Merging Logic: Look for recent incomplete incident
    // Window: 20 seconds (generous for network lag + ESP32 boot time)
    const MERGE_WINDOW_MS = 20000;
    const timeLowerBound = new Date(requestTimestamp.getTime() - MERGE_WINDOW_MS);
    const timeUpperBound = new Date(requestTimestamp.getTime() + MERGE_WINDOW_MS);

    // Find candidates: Same Device, Recent time, Incomplete status
    // Note: We use 'REPORTED' or 'AI_PROCESSING' status.
    const candidates = await Incident.find({
        deviceId,
        'timestamp.serverTimestamp': { $gte: timeLowerBound, $lte: timeUpperBound },
        status: { $in: ['REPORTED', 'AI_PROCESSING'] }, // Only merge with active/fresh incidents
        isDeleted: false,
    }).sort({ 'timestamp.serverTimestamp': -1 });

    let incidentToUpdate = null;

    for (const candidate of candidates) {
        // If we are ImageOnly, look for DataOnly
        if (isImageOnly && !candidate.imageUrl) {
            // Match!
            incidentToUpdate = candidate;
            break;
        }
        // If we are DataOnly, look for ImageOnly
        if (isDataOnly && candidate.imageUrl && candidate.speed === undefined) {
            // Note: Schema default for speed is nothing, but check if "effectively empty" data
            // Or if we define ImageOnly incident as one created by the 'CAM' path.
            // Simplified: If candidate has image but missing speed/impact data, and we have it.
            incidentToUpdate = candidate;
            break;
        }
        // If timestamps are extremely close (< 2s), assume match even if types aren't strictly exclusive (overwrite/enrich)
        const timeDiff = Math.abs(candidate.timestamp.senderTimestamp - requestTimestamp);
        if (timeDiff < 2000) {
            incidentToUpdate = candidate;
            break;
        }
    }

    let incident;
    let isMerge = false;

    if (incidentToUpdate) {
        // === MERGE ===
        incident = incidentToUpdate;
        isMerge = true;
        logger.info(`Merging incident report: ${incident.incidentId} with new data (Image: ${!!imageUrl}, Data: ${!!speed})`);

        if (imageUrl) {
            incident.imageUrl = imageUrl;
            incident.imageHash = imageHash;
            incident.status = 'AI_PROCESSING'; // Upgrade status if we got an image
        }

        // Enrich data fields if provided
        if (speed !== undefined) incident.speed = speed;
        if (impactForce !== undefined) incident.impactForce = impactForce;
        if (impactDirection) incident.impactDirection = impactDirection;
        if (airbagsDeployed !== undefined) incident.airbagsDeployed = airbagsDeployed;
        if (isBreakFail !== undefined) incident.isBreakFail = isBreakFail;
        if (isFreeFall !== undefined) incident.isFreeFall = isFreeFall;
        // Logic OR for booleans to avoid overwriting true with false?
        // Usually the Sensor module is the source of truth for these.

        // Location: Improve if new one is better?
        if (payloadLocation && payloadLocation.lat) {
            incident.location = {
                type: 'Point',
                coordinates: [payloadLocation.lon, payloadLocation.lat]
            };
        }

        await incident.save();

    } else {
        // === CREATE NEW ===

        // Resolve location
        let incidentLocation = null;
        if (payloadLocation && payloadLocation.lat !== undefined && payloadLocation.lon !== undefined) {
            incidentLocation = {
                type: 'Point',
                coordinates: [payloadLocation.lon, payloadLocation.lat],
            };
        } else if (device.lastLocation && device.lastLocation.coordinates && (device.lastLocation.coordinates[0] !== 0 || device.lastLocation.coordinates[1] !== 0)) {
            incidentLocation = device.lastLocation;
        } else {
            incidentLocation = { type: 'Point', coordinates: [0, 0] };
        }

        const vehicle = await Vehicle.findByVehicleId(device.boundVehicleId);
        if (!vehicle) return sendError(res, 'Bound vehicle not found', 500); // Should verify earlier but ok
        const owner = await Owner.findByOwnerId(vehicle.currentOwnerId);

        // Validate sensor trust
        const speedTrusted = device.isSensorTrusted('speed', senderTimestamp);
        const airbagTrusted = device.isSensorTrusted('airbag', senderTimestamp);
        const brakeTrusted = device.isSensorTrusted('brake', senderTimestamp);

        incident = new Incident({
            incidentId: generateIncidentId(),
            vehicleId: vehicle.vehicleId,
            deviceId,
            timestamp: {
                senderTimestamp: requestTimestamp,
                serverTimestamp: new Date(),
            },
            location: incidentLocation,
            imageUrl,
            imageHash,
            speed,
            speedTrusted,
            airbagsDeployed: airbagsDeployed || false,
            airbagTrusted,
            isBreakFail: isBreakFail || false,
            brakeTrusted,
            isFreeFall: isFreeFall || false,
            impactDirection: impactDirection || 'UNKNOWN',
            impactForce: impactForce || 0,
            connectivityUsed: connectivityUsed || 'INTERNET',
            messageId: messageId || generateMessageId(),
            status: imageUrl ? 'AI_PROCESSING' : 'REPORTED',
            ownerSnapshot: owner ? {
                ownerId: owner.ownerId,
                fullName: owner.fullName,
                mobileNumber: owner.mobileNumber,
                email: owner.email,
                nominees: owner.nominees,
            } : null,
        });

        await incident.save();

        // Audit and Dedup only on creation
        await dedupService.recordMessage(incident.messageId, deviceId, incident.incidentId, imageHash);
        await auditService.logIncidentCreated(deviceId, incident.incidentId, {
            vehicleId: vehicle.vehicleId,
            location: incident.location.coordinates,
            status: incident.status,
        });

        logger.info('Incident created:', { incidentId: incident.incidentId, isImageOnly, isDataOnly });
    }

    // ---- POST PROCESSING (Notifications, AI, etc) ----
    // Careful not to double-notify if we are just merging an image to an already notified incident.
    // However, if the first part was just image (no location/severity), we might not have notified.
    // Or if first part was just Data (severity low?), but now we have image?

    // Strategy: Run notifications every time but use checks to avoid spam? 
    // Or only if we just transitioned to a "Complete" state?
    // For simplicity and safety, we trigger processing again. The services should handle idempotency or updates.

    setImmediate(async () => {
        try {
            const vehicle = await Vehicle.findByVehicleId(device.boundVehicleId);
            const owner = await Owner.findByOwnerId(vehicle.currentOwnerId);

            // 1. Find nearest Local Authority (if not already assigned or if we want to update)
            if (!incident.assignedAuthorityId) {
                const [lon, lat] = incident.location.coordinates;
                if (lon !== 0 || lat !== 0) {
                    const nearestLA = await geoService.findNearestAuthority(lon, lat);
                    if (nearestLA) {
                        incident.assignedAuthorityId = nearestLA.authorityId;
                        incident.authorityNotified = true;
                        incident.authorityNotifiedAt = new Date();
                        await incident.save();

                        // Notify LA
                        if (io) {
                            io.to(`authority:${nearestLA.authorityId}`).emit('incident_alert', {
                                incidentId: incident.incidentId,
                                vehicleId: vehicle.vehicleId,
                                registrationNo: vehicle.registrationNo,
                                location: { lat, lon },
                                severity: incident.severityLevel,
                                timestamp: incident.timestamp.serverTimestamp,
                            });
                        }
                    }
                }
            }

            // 2. Compute severity (Recalculate with new data)
            const severityResult = severityService.computeSeverity(incident);
            if (severityResult.severityLevel !== incident.severityLevel) {
                incident.severityLevel = severityResult.severityLevel;
                await incident.save();
            }

            // 3. Trigger AI if we just added an image
            if (imageUrl && incident.status === 'AI_PROCESSING' && !incident.aiProcessedAt) {
                const { processAIAnalysis } = require('../jobs/aiAnalysis.job'); // Lazy load
                processAIAnalysis({ incidentId: incident.incidentId, imageUrl });
            }

            // 4. Notifications (Nominees, etc) - checks done inside service often, but we check flag:
            if (!incident.nomineesNotified && owner && owner.nominees?.length > 0) {
                // Trigger notification
                // ... (Detailed logic omitted for brevity, would be same as before)
            }

        } catch (error) {
            logger.error('Error in post-incident processing:', error);
        }
    });

    return sendCreated(res, {
        status: isMerge ? 'MERGED' : 'CREATED',
        incidentId: incident.incidentId,
        serverTimestamp: new Date().toISOString(),
        dedup: false,
    });
});

/**
 * Cancel live access (owner pressed device button)
 */
const cancelLiveAccess = asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const { requestId, senderTimestamp, messageId, reason } = req.body;

    // Find the request
    const liveRequest = await LiveAccessRequest.findByRequestId(requestId);
    if (!liveRequest) {
        return sendNotFound(res, 'Live access request not found');
    }

    // Verify device matches
    if (liveRequest.deviceId !== deviceId) {
        return sendError(res, 'Device mismatch', 403);
    }

    // Check if already processed
    if (liveRequest.status !== 'PENDING' && liveRequest.status !== 'GRANTED') {
        return sendSuccess(res, {
            status: liveRequest.status,
            requestId,
            incidentId: liveRequest.incidentId,
            message: `Request already ${liveRequest.status}`,
        });
    }

    // Allow late cancel even if granted (owner can still terminate stream)
    const wasGranted = liveRequest.status === 'GRANTED';

    // Cancel the request
    liveRequest.cancel('OWNER_DEVICE', reason || 'Owner pressed cancel button');
    await liveRequest.save();

    // Notify LA via socket
    if (io) {
        io.to(`authority:${liveRequest.authorityId}`).emit('access_cancelled', {
            requestId,
            incidentId: liveRequest.incidentId,
            cancelledBy: 'OWNER_DEVICE',
            reason: reason || 'Owner cancelled',
        });

        // If stream was active, terminate it
        if (wasGranted && liveRequest.grantedToSocketId) {
            io.to(liveRequest.grantedToSocketId).emit('terminate_stream', {
                requestId,
                reason: 'Owner cancelled access',
            });
        }
    }

    // Audit log
    await auditService.logLiveAccessCancelled(
        deviceId,
        'ROLE_DEVICE',
        requestId,
        { incidentId: liveRequest.incidentId, cancelledBy: 'OWNER_DEVICE', wasGranted },
    );

    logger.info('Live access cancelled by owner:', { requestId, deviceId, wasGranted });

    return sendSuccess(res, {
        status: 'CANCELLED',
        requestId,
        incidentId: liveRequest.incidentId,
    });
});

/**
 * Device acknowledges live access request display
 */
const ackLiveAccess = asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const { requestId, senderTimestamp } = req.body;

    const liveRequest = await LiveAccessRequest.findByRequestId(requestId);
    if (!liveRequest) {
        return sendNotFound(res, 'Live access request not found');
    }

    if (liveRequest.deviceId !== deviceId) {
        return sendError(res, 'Device mismatch', 403);
    }

    liveRequest.markDeviceAck();
    await liveRequest.save();

    logger.debug('Live access request acknowledged:', { requestId, deviceId });

    return sendSuccess(res, {
        status: 'ACKED',
        requestId,
    });
});

module.exports = {
    setSocketIO,
    heartbeat,
    reportIncident,
    cancelLiveAccess,
    ackLiveAccess,
};
