/**
 * Admin Controller
 * System administration operations
 */
const { Device, User, RTO, StateAuthority, LocalAuthority, AuditLog } = require('../models');
const { generateDeviceId, generateRtoId, generateStateId, generateApiKey } = require('../utils/idGenerator');
const logger = require('../utils/logger');
const { sendError, sendSuccess, sendCreated, sendNotFound, sendPaginated } = require('../utils/response');
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
    const apiKey = generateApiKey();
    device.apiKey = apiKey; // Pre-save hook will hash this

    await device.save();

    logger.info('Device created:', { deviceId: device.deviceId, serialNumber });

    return sendCreated(res, {
        deviceId: device.deviceId,
        serialNumber: device.serialNumber,
        apiKey, // Return plain key once
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
    const { name, code, region, district, state, contactEmail, contactPhone, address, password, lat, lon } = req.body;

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
        location: {
            type: 'Point',
            coordinates: [lon || 0, lat || 0] // Default to 0,0 if not provided, or make it required
        }
    });

    // Create User for RTO Admin
    const user = new User({
        email: contactEmail,
        password: password || 'Perseva@123', // Default password if not provided
        roles: ['ROLE_RTO'],
        name,
        referenceId: rtoId,
        rtoId, // Set specific ID
        isActive: true,
    });

    await Promise.all([rto.save(), user.save()]);

    return sendCreated(res, { rtoId: rto.rtoId, name: rto.name, code: rto.code, userEmail: user.email });
});

/**
 * Create State Authority
 */
const createStateAuthority = asyncHandler(async (req, res) => {
    const { name, code, state, contactEmail, contactPhone, address, password } = req.body;

    // Check if user exists
    if (await User.findOne({ email: contactEmail })) {
        return sendError(res, 'User with this email already exists', 400);
    }

    const stateId = generateStateId();
    const stateAuth = new StateAuthority({
        stateId,
        name,
        code,
        state,
        contactEmail,
        contactPhone,
        address,
        createdBy: req.user?.userId,
    });

    // Create User for State Admin
    const user = new User({
        email: contactEmail,
        password: password || 'Perseva@123',
        roles: ['ROLE_STATE_AUTH'],
        name,
        referenceId: stateId,
        stateId, // Set specific ID field
        isActive: true,
    });

    await Promise.all([stateAuth.save(), user.save()]);

    return sendCreated(res, { stateId: stateAuth.stateId, name: stateAuth.name, userEmail: user.email });
});

/**
 * List State Authorities
 */
const listStateAuthorities = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search } = req.query;
    const query = { isDeleted: false };

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { state: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } }
        ];
    }

    const total = await StateAuthority.countDocuments(query);
    const authorities = await StateAuthority.find(query)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit);

    return sendPaginated(res, authorities, { page: parseInt(page), limit: parseInt(limit), total });
});

/**
 * Update State Authority
 */
const updateStateAuthority = asyncHandler(async (req, res) => {
    const { stateId } = req.params;
    const { name, code, state, contactEmail, contactPhone, address } = req.body;

    const authority = await StateAuthority.findOne({ stateId, isDeleted: false });
    if (!authority) return sendNotFound(res, 'State Authority not found');

    if (name) authority.name = name;
    if (code) authority.code = code;
    if (state) authority.state = state;
    if (contactEmail) authority.contactEmail = contactEmail;
    if (contactPhone) authority.contactPhone = contactPhone;
    if (address) authority.address = address;

    await authority.save();

    // Also update the associated User if needed (name/email)
    const user = await User.findOne({ referenceId: stateId, roles: 'ROLE_STATE_AUTH' });
    if (user) {
        if (name) user.name = name;
        if (contactEmail) user.email = contactEmail;
        await user.save();
    }

    return sendSuccess(res, authority);
});

/**
 * Delete State Authority
 */
const deleteStateAuthority = asyncHandler(async (req, res) => {
    const { stateId } = req.params;

    const authority = await StateAuthority.findOne({ stateId, isDeleted: false });
    if (!authority) return sendNotFound(res, 'State Authority not found');

    authority.isDeleted = true;
    authority.deletedAt = new Date();
    await authority.save();

    // Disable associated User
    const user = await User.findOne({ referenceId: stateId, roles: 'ROLE_STATE_AUTH' });
    if (user) {
        user.isActive = false;
        user.isDeleted = true;
        user.deletedAt = new Date();
        await user.save();
    }

    return sendSuccess(res, { message: 'State Authority deleted successfully' });
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
    listStateAuthorities,
    updateStateAuthority,
    deleteStateAuthority,
    getSystemStats,
    getAuditLogs,
};
