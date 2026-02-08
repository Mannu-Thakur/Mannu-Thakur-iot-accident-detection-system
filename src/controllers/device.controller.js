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
const reportIncident = asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const device = req.deviceDoc;

    // Parse payload from multipart form
    let payload;
    try {
        payload = typeof req.body.payload === 'string'
            ? JSON.parse(req.body.payload)
            : req.body.payload || req.body;
    } catch (error) {
        return sendError(res, 'Invalid payload JSON', 400);
    }

    const {
        messageId, senderTimestamp, location: payloadLocation, speed,
        airbagsDeployed, isBreakFail, isFreeFall, impactDirection, impactForce, connectivityUsed
    } = payload;

    // Validate device is bound
    if (!device.boundVehicleId) {
        return sendError(res, 'Device not bound to any vehicle', 400);
    }

    // Resolve location: Payload > Device Last Location > Default
    let incidentLocation = null;
    if (payloadLocation && payloadLocation.lat !== undefined && payloadLocation.lon !== undefined) {
        incidentLocation = {
            type: 'Point',
            coordinates: [payloadLocation.lon, payloadLocation.lat],
        };
    } else if (device.lastLocation && device.lastLocation.coordinates && (device.lastLocation.coordinates[0] !== 0 || device.lastLocation.coordinates[1] !== 0)) {
        logger.info('Using device last known location for incident', { deviceId });
        incidentLocation = device.lastLocation;
    } else {
        logger.warn('No location provided for incident', { deviceId });
        // Can fail or allow null depending on requirements. 
        // For safety, we allow it but severity might be affected or LA assignment might fail.
        incidentLocation = {
            type: 'Point',
            coordinates: [0, 0], // Default placeholder, or make schema optional
        };
    }

    // Get image if uploaded
    const imageFile = req.file;
    let imageUrl = null;
    let imageHash = null;

    if (imageFile) {
        imageUrl = `/uploads/${imageFile.filename}`;
        imageHash = hashBuffer(imageFile.buffer || require('fs').readFileSync(imageFile.path));
    }

    // Check for duplicate
    const dupCheck = await dedupService.checkDuplicate(messageId, imageHash, deviceId);
    if (dupCheck.isDuplicate) {
        logger.info('Duplicate incident detected:', { messageId, incidentId: dupCheck.incidentId });
        return sendSuccess(res, {
            status: 'RECEIVED',
            incidentId: dupCheck.incidentId,
            serverTimestamp: new Date().toISOString(),
            dedup: true,
        });
    }

    // Get vehicle and owner info
    const vehicle = await Vehicle.findByVehicleId(device.boundVehicleId);
    if (!vehicle) {
        return sendError(res, 'Bound vehicle not found', 500);
    }

    const owner = await Owner.findByOwnerId(vehicle.currentOwnerId);

    // Validate sensor trust based on attach dates
    const speedTrusted = device.isSensorTrusted('speed', senderTimestamp);
    const airbagTrusted = device.isSensorTrusted('airbag', senderTimestamp);
    const brakeTrusted = device.isSensorTrusted('brake', senderTimestamp);

    // Create incident
    const incidentId = generateIncidentId();
    const effectiveSenderTimestamp = senderTimestamp ? new Date(senderTimestamp) : new Date();
    const incident = new Incident({
        incidentId,
        vehicleId: vehicle.vehicleId,
        deviceId,
        timestamp: {
            senderTimestamp: effectiveSenderTimestamp,
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

    // Record message for deduplication
    await dedupService.recordMessage(incident.messageId, deviceId, incidentId, imageHash);

    // Audit log
    await auditService.logIncidentCreated(deviceId, incidentId, {
        vehicleId: vehicle.vehicleId,
        location: incident.location.coordinates,
        status: incident.status,
    });

    logger.info('Incident created:', {
        incidentId,
        deviceId,
        vehicleId: vehicle.vehicleId,
        location: incident.location.coordinates,
    });

    // ---- PARALLEL ASYNC OPERATIONS ----
    // These run in parallel and don't block the response

    setImmediate(async () => {
        try {
            // 1. Find nearest Local Authority and notify
            const [lon, lat] = incident.location.coordinates;
            // Ensure valid coords for search
            let nearestLA = null;
            if (lon !== 0 || lat !== 0) {
                nearestLA = await geoService.findNearestAuthority(lon, lat);
            }

            if (nearestLA) {
                incident.assignedAuthorityId = nearestLA.authorityId;
                incident.authorityNotified = true;
                incident.authorityNotifiedAt = new Date();
                await incident.save();

                logger.info('Assigned to authority:', { incidentId, authorityId: nearestLA.authorityId });

                // Notify LA via socket
                if (io) {
                    io.to(`authority:${nearestLA.authorityId}`).emit('incident_alert', {
                        incidentId,
                        vehicleId: vehicle.vehicleId,
                        registrationNo: vehicle.registrationNo,
                        location: { lat, lon },
                        severity: incident.severityLevel,
                        timestamp: incident.timestamp.serverTimestamp,
                    });
                }

                // Notify LA via SMS if they have a contact number
                if (nearestLA.contactPhone) {
                    await notificationService.notifyAuthorityViaSMS(nearestLA.contactPhone, {
                        incidentId,
                        vehicleId: vehicle.vehicleId,
                        registrationNo: vehicle.registrationNo,
                        location: incident.location,
                    });
                }
            }

            // 2. Notify nominees via SMS
            if (owner && owner.nominees && owner.nominees.length > 0) {
                const notifyResult = await notificationService.notifyNominees(owner.nominees, {
                    incidentId,
                    vehicleId: vehicle.vehicleId,
                    registrationNo: vehicle.registrationNo,
                    location: incident.location,
                    timestamp: incident.timestamp,
                });

                if (notifyResult.successful > 0) {
                    incident.markNomineesNotified();
                    await incident.save();

                    // Audit log
                    await auditService.logNomineesNotified(incidentId, {
                        notifiedCount: notifyResult.successful,
                        totalNominees: owner.nominees.length,
                    });
                }

                logger.info('Nominees notified:', {
                    incidentId,
                    successful: notifyResult.successful,
                    failed: notifyResult.failed
                });
            }

            // 3. Compute initial severity (without AI results)
            const severityResult = severityService.computeSeverity(incident);
            incident.severityLevel = severityResult.severityLevel;
            await incident.save();

            // 4. If severity is high, auto-create live access request
            if (severityResult.severityLevel >= config.severity.autoDispatchThreshold && device.camEnabled && nearestLA) {
                const requestId = generateRequestId();
                const liveRequest = new LiveAccessRequest({
                    requestId,
                    incidentId,
                    deviceId,
                    vehicleId: vehicle.vehicleId,
                    ownerId: vehicle.currentOwnerId,
                    authorityId: nearestLA.authorityId,
                    reason: 'Auto-generated for high severity incident',
                    expiresAt: new Date(Date.now() + config.liveAccess.windowSeconds * 1000),
                    deviceWasOnline: device.isOnline,
                });

                await liveRequest.save();
                incident.liveAccessRequestId = requestId;
                await incident.save();

                // Push to device if online
                if (device.isOnline && device.connection?.socketId && io) {
                    io.to(device.connection.socketId).emit('live_access_request', {
                        requestId,
                        incidentId,
                        authorityId: nearestLA.authorityId,
                        authorityName: nearestLA.name,
                        expiresAt: liveRequest.expiresAt,
                        message: 'Local Authority requests live preview. Press CANCEL to reject.',
                    });
                    liveRequest.markSentToDevice();
                    await liveRequest.save();
                } else {
                    // Fallback: notify owner via SMS
                    if (owner?.mobileNumber) {
                        await notificationService.notifyOwnerLiveAccessRequest(owner.mobileNumber, {
                            vehicleId: vehicle.vehicleId,
                            registrationNo: vehicle.registrationNo,
                            authorityName: nearestLA.name,
                            reason: liveRequest.reason,
                            expiresAt: liveRequest.expiresAt,
                        });
                        liveRequest.markFallbackSent();
                        await liveRequest.save();
                    }
                }
            }

            // 5. Enqueue AI analysis job (if image present)
            if (imageUrl) {
                // In production, use Bull queue
                // For now, we'll use a simple timeout to simulate
                const { processAIAnalysis } = require('../jobs/aiAnalysis.job');
                processAIAnalysis({ incidentId, imageUrl });
            }

        } catch (error) {
            logger.error('Error in post-incident processing:', error);
        }
    });

    // Return immediately
    return sendCreated(res, {
        status: 'RECEIVED',
        incidentId,
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
