/**
 * Authority Controller
 * Handles Local Authority operations: incidents, live access, rescue tasks
 */
const mongoose = require('mongoose');
const { Incident, LiveAccessRequest, RescueTask, Employee, LocalAuthority, Device, Vehicle, User } = require('../models');
const { geoService, auditService, streamService, notificationService } = require('../services');
const { generateRequestId, generateTaskId } = require('../utils/idGenerator');
const logger = require('../utils/logger');
const config = require('../config');
const { sendSuccess, sendCreated, sendError, sendNotFound, sendConflict, sendPaginated } = require('../utils/response');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Get socket.io instance
let io = null;
const setSocketIO = (socketIO) => {
    io = socketIO;
};

/**
 * Helper to get authorityId from body or user profile
 */
const getAuthorityId = (req) => {
    return req.body.authorityId || req.user?.authorityId || req.user?.referenceId;
};

/**
 * Get incidents dashboard
 */
const getIncidents = asyncHandler(async (req, res) => {
    const authorityId = getAuthorityId(req);
    if (!authorityId) {
        return sendError(res, 'authorityId is required', 400);
    }
    const { page = 1, limit = 50, status, severityLevel, minSeverity, fromDate, toDate } = req.body;

    const query = {
        isDeleted: false,
        $or: [
            { assignedAuthorityId: authorityId },
            { assignedAuthorityId: { $exists: false } },
        ],
    };

    if (status) query.status = status;
    if (severityLevel) query.severityLevel = parseInt(severityLevel);
    if (minSeverity) query.severityLevel = { $gte: parseInt(minSeverity) };

    if (fromDate || toDate) {
        query['timestamp.serverTimestamp'] = {};
        if (fromDate) query['timestamp.serverTimestamp'].$gte = new Date(fromDate);
        if (toDate) query['timestamp.serverTimestamp'].$lte = new Date(toDate);
    }

    const total = await Incident.countDocuments(query);
    const incidents = await Incident.find(query)
        .select('incidentId vehicleId deviceId timestamp location severityLevel status aiFireDetected aiWaterSubmerged imageUrl ownerSnapshot assignedAuthorityId')
        .sort({ 'timestamp.serverTimestamp': -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    // Enrich with vehicle info
    const enrichedIncidents = await Promise.all(incidents.map(async (inc) => {
        const vehicle = await Vehicle.findByVehicleId(inc.vehicleId);
        return {
            ...inc.toObject(),
            vehicle: vehicle ? {
                registrationNo: vehicle.registrationNo,
                vehicleType: vehicle.vehicleType,
                model: vehicle.model,
            } : null,
        };
    }));

    return sendPaginated(res, enrichedIncidents, { page, limit, total });
});

/**
 * Get incident details
 */
const getIncidentDetails = asyncHandler(async (req, res) => {
    const authorityId = getAuthorityId(req);
    const { incidentId } = req.body;

    const incident = await Incident.findByIncidentId(incidentId);
    if (!incident) {
        return sendNotFound(res, 'Incident not found');
    }

    // Get related data
    const vehicle = await Vehicle.findByVehicleId(incident.vehicleId);
    const device = await Device.findByDeviceId(incident.deviceId);
    const liveRequest = incident.liveAccessRequestId
        ? await LiveAccessRequest.findByRequestId(incident.liveAccessRequestId)
        : null;
    const rescueTask = incident.rescueTaskId
        ? await RescueTask.findByTaskId(incident.rescueTaskId)
        : null;

    return sendSuccess(res, {
        ...incident.toObject(),
        vehicle: vehicle ? {
            vehicleId: vehicle.vehicleId,
            registrationNo: vehicle.registrationNo,
            vehicleType: vehicle.vehicleType,
            model: vehicle.model,
            manufacturer: vehicle.manufacturer,
        } : null,
        device: device ? {
            deviceId: device.deviceId,
            camEnabled: device.camEnabled,
            isOnline: device.isOnline,
        } : null,
        liveAccessRequest: liveRequest,
        rescueTask: rescueTask,
    });
});

/**
 * Request live preview
 */
const requestLiveAccess = asyncHandler(async (req, res) => {
    const authorityId = getAuthorityId(req);
    if (!authorityId) {
        return sendError(res, 'authorityId is required', 400);
    }
    const { incidentId, reason, expiresInSeconds } = req.body;

    // Validate incident
    const incident = await Incident.findByIncidentId(incidentId);
    if (!incident) {
        return sendNotFound(res, 'Incident not found');
    }

    // Check if there's already an active request
    const existingRequest = await LiveAccessRequest.findActiveByIncident(incidentId);
    if (existingRequest) {
        return sendConflict(res, 'An active live access request already exists', {
            requestId: existingRequest.requestId,
            status: existingRequest.status,
            expiresAt: existingRequest.expiresAt,
        });
    }

    // Get device
    const device = await Device.findByDeviceId(incident.deviceId);
    if (!device) {
        return sendError(res, 'Device not found', 500);
    }

    if (!device.camEnabled) {
        return sendError(res, 'Device does not have camera capability', 400);
    }

    // Get vehicle for registration number
    const vehicle = await Vehicle.findByVehicleId(incident.vehicleId);

    // Create live access request
    const requestId = generateRequestId();
    const expirySeconds = expiresInSeconds || config.liveAccess.windowSeconds;

    const liveRequest = new LiveAccessRequest({
        requestId,
        incidentId,
        deviceId: device.deviceId,
        vehicleId: incident.vehicleId,
        ownerId: incident.ownerSnapshot?.ownerId || vehicle?.currentOwnerId,
        authorityId,
        reason: reason || 'Incident verification',
        expiresAt: new Date(Date.now() + expirySeconds * 1000),
        deviceWasOnline: device.isOnline,
        requestedBy: req.user?.userId,
    });

    await liveRequest.save();

    // Update incident
    incident.liveAccessRequestId = requestId;
    await incident.save();

    // Push to device if online
    if (device.isOnline && device.connection?.socketId && io) {
        const authority = await LocalAuthority.findByAuthorityId(authorityId);

        io.to(device.connection.socketId).emit('live_access_request', {
            requestId,
            incidentId,
            authorityId,
            authorityName: authority?.name || 'Local Authority',
            expiresAt: liveRequest.expiresAt,
            message: 'Local Authority requests live preview for incident verification. Press CANCEL on your device to reject.',
        });

        liveRequest.markSentToDevice();
        await liveRequest.save();

        logger.info('Live access request sent to device:', { requestId, deviceId: device.deviceId });
    } else {
        // Device offline - send fallback notification to owner
        if (incident.ownerSnapshot?.mobileNumber) {
            const authority = await LocalAuthority.findByAuthorityId(authorityId);

            await notificationService.notifyOwnerLiveAccessRequest(incident.ownerSnapshot.mobileNumber, {
                vehicleId: incident.vehicleId,
                registrationNo: vehicle?.registrationNo,
                authorityName: authority?.name || 'Local Authority',
                reason: liveRequest.reason,
                expiresAt: liveRequest.expiresAt,
            });

            liveRequest.markFallbackSent();
            await liveRequest.save();
        }

        logger.info('Device offline, fallback notification sent:', { requestId });
    }

    // Audit log
    await auditService.logLiveAccessRequested(
        req.user?.userId || authorityId,
        'ROLE_LOCAL_AUTH',
        requestId,
        { incidentId, deviceId: device.deviceId, reason },
    );

    return sendCreated(res, {
        requestId,
        status: 'PENDING',
        expiresAt: liveRequest.expiresAt,
        deviceOnline: device.isOnline,
    });
});

/**
 * Get live access request status
 */
const getLiveAccessStatus = asyncHandler(async (req, res) => {
    const authorityId = getAuthorityId(req);
    const { requestId } = req.body;

    const liveRequest = await LiveAccessRequest.findByRequestId(requestId);
    if (!liveRequest) {
        return sendNotFound(res, 'Live access request not found');
    }

    // Return status with stream token if granted
    const response = {
        requestId: liveRequest.requestId,
        incidentId: liveRequest.incidentId,
        status: liveRequest.status,
        expiresAt: liveRequest.expiresAt,
        deviceAckAt: liveRequest.deviceAckAt,
    };

    if (liveRequest.status === 'GRANTED' && liveRequest.streamToken) {
        response.streamToken = liveRequest.streamToken;
        response.streamTokenExpiresAt = liveRequest.streamTokenExpiresAt;
    }

    return sendSuccess(res, response);
});

/**
 * Respond to live access request (Device only)
 */
const respondToLiveAccess = asyncHandler(async (req, res) => {
    const { requestId, status, streamToken, streamTokenExpiresIn } = req.body;

    const liveRequest = await LiveAccessRequest.findByRequestId(requestId);
    if (!liveRequest) {
        return sendNotFound(res, 'Live access request not found');
    }

    if (liveRequest.status !== 'PENDING') {
        return sendConflict(res, `Request is already ${liveRequest.status}`);
    }

    // Verify it's the correct device responding (API key auth should handle this identity check usually, 
    // but here we verify the deviceId matches the token's deviceId if available, or just trust the device API key middleware)
    // Assuming middleware puts device info in req.device or similar, but for now we trust the endpoint access.

    liveRequest.status = status;
    liveRequest.deviceAckAt = new Date();

    if (status === 'GRANTED') {
        if (!streamToken) {
            return sendError(res, 'Stream token required when granting access', 400);
        }
        liveRequest.streamToken = streamToken;
        liveRequest.streamTokenExpiresAt = new Date(Date.now() + (streamTokenExpiresIn || 300) * 1000);
    }

    await liveRequest.save();

    // Notify Authority via Socket
    if (io) {
        // We need to find which socket belongs to the authority
        // Ideally we room them by authorityId
        io.to(`authority:${liveRequest.authorityId}`).emit('live_access_response', {
            requestId,
            status,
            streamToken: status === 'GRANTED' ? streamToken : null,
            incidentId: liveRequest.incidentId,
        });
    }

    logger.info('Live access response processed:', { requestId, status, deviceId: liveRequest.deviceId });

    return sendSuccess(res, { status: 'UPDATED' });
});

/**
 * Assign rescue task
 */
const assignTask = asyncHandler(async (req, res) => {
    const authorityId = getAuthorityId(req);
    if (!authorityId) {
        return sendError(res, 'authorityId is required', 400);
    }
    const { incidentId, employeeIds, priority, notes, estimatedArrivalMinutes } = req.body;

    // Validate incident
    const incident = await Incident.findByIncidentId(incidentId);
    if (!incident) {
        return sendNotFound(res, 'Incident not found');
    }

    if (['RESOLVED', 'ARCHIVED'].includes(incident.status)) {
        return sendError(res, 'Incident already resolved', 400);
    }

    // Check if task already exists
    const existingTask = await RescueTask.findByIncidentId(incidentId);
    if (existingTask && !['COMPLETED', 'CANCELLED'].includes(existingTask.status)) {
        return sendConflict(res, 'Active rescue task already exists for this incident', {
            taskId: existingTask.taskId,
            status: existingTask.status,
        });
    }

    // Verify employees are available
    const employees = await Employee.find({
        employeeId: { $in: employeeIds },
        authorityId,
        isDeleted: false,
    });

    if (employees.length !== employeeIds.length) {
        const foundIds = employees.map(e => e.employeeId);
        const notFound = employeeIds.filter(id => !foundIds.includes(id));
        return sendError(res, `Employees not found: ${notFound.join(', ')}`, 422);
    }

    const unavailable = employees.filter(e => e.status !== 'AVAILABLE');
    if (unavailable.length > 0) {
        return sendConflict(res, 'Some employees are not available', {
            unavailable: unavailable.map(e => ({
                employeeId: e.employeeId,
                name: e.name,
                status: e.status,
            })),
        });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Create task
        const taskId = generateTaskId();
        const task = new RescueTask({
            taskId,
            incidentId,
            assignedAuthorityId: authorityId,
            assignedBy: req.user?.userId,
            employeeIds,
            priority: priority || 3,
            notes,
            estimatedArrivalMinutes,
            status: 'ASSIGNED',
            assignedAt: new Date(),
            location: incident.location,
        });

        // Add employee assignments
        employees.forEach(emp => {
            task.addEmployee(emp);
        });

        await task.save({ session });

        // Atomically update employee statuses
        const updateResult = await Employee.bulkSetBusy(employeeIds, taskId);

        if (updateResult.modifiedCount !== employeeIds.length) {
            throw new AppError('Failed to assign all employees - race condition detected', 409);
        }

        // Update incident
        incident.dispatch(taskId);
        await incident.save({ session });

        await session.commitTransaction();

        // Notify employees via socket
        if (io) {
            employees.forEach(emp => {
                io.to(`employee:${emp.employeeId}`).emit('task_assigned', {
                    taskId,
                    incidentId,
                    location: incident.location,
                    priority,
                    estimatedArrivalMinutes,
                });
            });
        }

        // Send SMS to employees
        const phoneNumbers = employees.map(e => e.contact).filter(Boolean);
        if (phoneNumbers.length > 0) {
            const smsMessage = `URGENT: New Rescue Task Assigned.\nIncident: ${incidentId}\nLocation: https://maps.google.com/?q=${incident.location?.coordinates?.[1]},${incident.location?.coordinates?.[0]}\nPriority: ${priority || 'Normal'}`;
            await notificationService.sendBulkSMS(phoneNumbers, smsMessage);
        }

        // Audit log
        await auditService.logTaskAssigned(
            req.user?.userId || authorityId,
            'ROLE_LOCAL_AUTH',
            taskId,
            { incidentId, employeeIds, priority },
        );

        logger.info('Rescue task assigned:', { taskId, incidentId, employeeCount: employeeIds.length });

        return sendCreated(res, {
            taskId,
            status: 'ASSIGNED',
            assignedAt: task.assignedAt,
            employeeCount: employeeIds.length,
        });

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Get tasks
 */
const getTasks = asyncHandler(async (req, res) => {
    const authorityId = getAuthorityId(req);
    if (!authorityId) {
        return sendError(res, 'authorityId is required', 400);
    }
    const { page = 1, limit = 50, status } = req.body;

    const query = { assignedAuthorityId: authorityId, isDeleted: false };
    if (status) query.status = status;

    const total = await RescueTask.countDocuments(query);
    const tasks = await RescueTask.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    return sendPaginated(res, tasks, { page, limit, total });
});

/**
 * Update task
 */
const updateTask = asyncHandler(async (req, res) => {
    const authorityId = getAuthorityId(req);
    if (!authorityId) {
        return sendError(res, 'authorityId is required', 400);
    }
    const { taskId, status, arrivedAt, completedAt, resolutionReport, notes, cancelReason } = req.body;

    const task = await RescueTask.findByTaskId(taskId);
    if (!task) {
        return sendNotFound(res, 'Task not found');
    }

    if (task.assignedAuthorityId !== authorityId) {
        return sendError(res, 'Task belongs to another authority', 403);
    }

    // Update fields
    if (status) {
        if (status === 'COMPLETED') {
            task.complete(resolutionReport, req.user?.userId);

            // Release employees
            await Employee.bulkSetAvailable(task.employeeIds);

            // Update incident
            const incident = await Incident.findByIncidentId(task.incidentId);
            if (incident) {
                incident.resolve(resolutionReport, req.user?.userId);
                await incident.save();
            }
        } else if (status === 'CANCELLED') {
            task.cancel(cancelReason, req.user?.userId);

            // Release employees
            await Employee.bulkSetAvailable(task.employeeIds);
        } else {
            task.status = status;
        }
    }

    if (arrivedAt) task.arrivedAt = new Date(arrivedAt);
    if (notes) task.notes = notes;

    await task.save();

    logger.info('Task updated:', { taskId, status });

    return sendSuccess(res, {
        taskId: task.taskId,
        status: task.status,
        updatedAt: task.updatedAt,
    });
});

/**
 * Get employees
 */
const getEmployees = asyncHandler(async (req, res) => {
    const authorityId = getAuthorityId(req);
    if (!authorityId) {
        return sendError(res, 'authorityId is required', 400);
    }
    const { page = 1, limit = 50, status, role } = req.body;

    const query = { authorityId, isDeleted: false };
    if (status) query.status = status;
    if (role) query.role = role;

    const total = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
        .select('employeeId name role contact status lastLocation isOnline')
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit);

    return sendPaginated(res, employees, { page, limit, total });
});

/**
 * Create local authority
 */
const createLocalAuthority = asyncHandler(async (req, res) => {
    const { name, code, district, state, location, contactEmail, contactPhone, address, emergencyNumbers } = req.body;

    const authority = new LocalAuthority({
        name,
        code,
        district,
        state,
        location: {
            type: 'Point',
            coordinates: [location.lon, location.lat],
        },
        contactEmail,
        contactPhone,
        address,
        emergencyNumbers,
        createdBy: req.user?.userId,
    });

    await authority.save();

    logger.info('Local authority created:', { authorityId: authority.authorityId, name });

    return sendCreated(res, {
        authorityId: authority.authorityId,
        name: authority.name,
        district: authority.district,
        state: authority.state,
    });
});

/**
 * Create employee
 */
const createEmployee = asyncHandler(async (req, res) => {
    console.log("req to create employee", req.body);
    const authorityId = getAuthorityId(req);
    if (!authorityId) {
        return sendError(res, 'authorityId is required', 400);
    }
    const { name, email, contact, role, shiftStart, shiftEnd, workDays } = req.body;

    // Validate authority exists
    const authority = await LocalAuthority.findByAuthorityId(authorityId);
    if (!authority) {
        return sendNotFound(res, 'Authority not found');
    }

    // Check if user exists
    if (await User.findOne({ email })) {
        return sendError(res, 'User with this email already exists', 400);
    }

    const employee = new Employee({
        name,
        email,
        contact,
        role,
        authorityId,
        shiftStart,
        shiftEnd,
        workDays,
        createdBy: req.user?.userId,
    });

    // Create User for Employee
    const user = new User({
        email,
        password: 'Perseva@123', // Default password
        roles: ['ROLE_EMPLOYEE'],
        name,
        referenceId: employee.employeeId, // Use referenceId strictly or add employeeId to schema
        employeeId: employee.employeeId,
        authorityId: authorityId,
        isActive: true,
    });

    await Promise.all([employee.save(), user.save()]);

    logger.info('Employee created:', { employeeId: employee.employeeId, name, authorityId });

    return sendCreated(res, {
        employeeId: employee.employeeId,
        name: employee.name,
        role: employee.role,
        userEmail: user.email,
        defaultPassword: 'Perseva@123'
    });
});

module.exports = {
    setSocketIO,
    getIncidents,
    getIncidentDetails,
    requestLiveAccess,
    getLiveAccessStatus,
    respondToLiveAccess,
    assignTask,
    getTasks,
    updateTask,
    getEmployees,
    createLocalAuthority,
    createEmployee,
};
