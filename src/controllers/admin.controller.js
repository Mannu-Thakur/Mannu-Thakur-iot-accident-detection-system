/**
 * Admin Controller
 * System administration operations
 */
const { Device, User, RTO, StateAuthority, LocalAuthority, AuditLog } = require('../models');
const { generateDeviceId, generateRtoId, generateStateId, generateApiKey } = require('../utils/idGenerator');
const logger = require('../utils/logger');
const { sendSuccess, sendCreated, sendNotFound, sendPaginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Create new device
 */
const createDevice = asyncHandler(async (req, res) => {
    const { serialNumber, camEnabled, firmwareVersion, speedometerAttachedDate, brakeInputDate, airbagInputDate } = req.body;

    const device = new Device({
        deviceId: generateDeviceId(),
        serialNumber,
        camEnabled: camEnabled !== false,
        firmwareVersion,
        speedometerAttachedDate,
        brakeInputDate,
        airbagInputDate,
        lifecycleStatus: 'PENDING_ACTIVATION',
        createdBy: req.user?.userId,
    });

    // Generate API key
    device.apiKeyHash = await require('bcryptjs').hash(generateApiKey(), 10);
    const apiKey = generateApiKey(); // Note: In real impl, store hashed, return plain once

    await device.save();

    logger.info('Device created:', { deviceId: device.deviceId, serialNumber });

    return sendCreated(res, {
        deviceId: device.deviceId,
        serialNumber: device.serialNumber,
        apiKey, // Only returned once on creation
    });
});

/**
 * List devices
 */
const listDevices = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, bound } = req.query;

    const query = { isDeleted: false };
    if (status) query.lifecycleStatus = status;
    if (bound !== undefined) {
        if (bound === 'true') query.boundVehicleId = { $exists: true, $ne: null };
        else query.boundVehicleId = { $exists: false };
    }

    const total = await Device.countDocuments(query);
    const devices = await Device.find(query)
        .select('deviceId serialNumber firmwareVersion lifecycleStatus camEnabled boundVehicleId isOnline lastHeartbeat')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    return sendPaginated(res, devices, { page: parseInt(page), limit: parseInt(limit), total });
});

/**
 * Activate device
 */
const activateDevice = asyncHandler(async (req, res) => {
    const { deviceId } = req.params;

    const device = await Device.findByDeviceId(deviceId);
    if (!device) return sendNotFound(res, 'Device not found');

    device.activate();
    await device.save();

    return sendSuccess(res, { deviceId, status: device.lifecycleStatus });
});

/**
 * Create RTO
 */
const createRTO = asyncHandler(async (req, res) => {
    const { name, code, region, district, state, contactEmail, contactPhone, address, password } = req.body;

    // Check if user exists
    if (await User.findOne({ email: contactEmail })) {
        return sendError(res, 'User with this email already exists', 400);
    }

    const rtoId = generateRtoId();
    const rto = new RTO({
        rtoId,
        name,
        code,
        region,
        district,
        state,
        contactEmail,
        contactPhone,
        address,
        createdBy: req.user?.userId,
    });

    // Create User for RTO Admin
    const user = new User({
        email: contactEmail,
        password: password || 'Perseva@123', // Default password if not provided
        role: 'RTO',
        name,
        referenceId: rtoId,
        isActive: true,
    });

    await Promise.all([rto.save(), user.save()]);

    return sendCreated(res, { rtoId: rto.rtoId, name: rto.name, code: rto.code, userEmail: user.email });
});

/**
 * Create State Authority
 */
const createStateAuthority = asyncHandler(async (req, res) => {
    const { name, code, contactEmail, contactPhone, address, password } = req.body;

    // Check if user exists
    if (await User.findOne({ email: contactEmail })) {
        return sendError(res, 'User with this email already exists', 400);
    }

    const stateId = generateStateId();
    const stateAuth = new StateAuthority({
        stateId,
        name,
        code,
        contactEmail,
        contactPhone,
        address,
        createdBy: req.user?.userId,
    });

    // Create User for State Admin
    const user = new User({
        email: contactEmail,
        password: password || 'Perseva@123',
        role: 'STATE_AUTHORITY',
        name,
        referenceId: stateId,
        isActive: true,
    });

    await Promise.all([stateAuth.save(), user.save()]);

    return sendCreated(res, { stateId: stateAuth.stateId, name: stateAuth.name, userEmail: user.email });
});

/**
 * Get system stats
 */
const getSystemStats = asyncHandler(async (req, res) => {
    const [devices, authorities, rtos, users] = await Promise.all([
        Device.countDocuments({ isDeleted: false }),
        LocalAuthority.countDocuments({ isDeleted: false }),
        RTO.countDocuments({ isDeleted: false }),
        User.countDocuments({ isDeleted: false }),
    ]);

    const onlineDevices = await Device.countDocuments({ isDeleted: false, isOnline: true });

    return sendSuccess(res, {
        devices: { total: devices, online: onlineDevices },
        authorities,
        rtos,
        users,
    });
});

/**
 * Get audit logs
 */
const getAuditLogs = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, action, targetType } = req.query;

    const query = {};
    if (action) query.action = action;
    if (targetType) query.targetType = targetType;

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    return sendPaginated(res, logs, { page: parseInt(page), limit: parseInt(limit), total });
});

module.exports = {
    createDevice,
    listDevices,
    activateDevice,
    createRTO,
    createStateAuthority,
    getSystemStats,
    getAuditLogs,
};
