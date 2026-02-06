/**
 * RTO Controller
 * Handles RTO operations: owner creation, vehicle registration, transfers
 */
const mongoose = require('mongoose');
const { Owner, Vehicle, Device, AuditLog, User, Incident } = require('../models');
const { auditService } = require('../services');
const { generateOwnerId, generateVehicleId, generateNomineeId } = require('../utils/idGenerator');
const logger = require('../utils/logger');
const { sendSuccess, sendCreated, sendError, sendNotFound, sendConflict, sendPaginated } = require('../utils/response');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

/**
 * Create a new owner (RTO only)
 */
const createOwner = asyncHandler(async (req, res) => {
    const { fullName, email, mobileNumber, address, nominees, documents, ownerId: customOwnerId } = req.body;

    // Check for existing email
    const existingOwner = await Owner.findOne({ email: email.toLowerCase(), isDeleted: false });
    if (existingOwner) {
        return sendConflict(res, 'An owner with this email already exists', { existingOwnerId: existingOwner.ownerId });
    }

    // Generate owner ID or use custom
    const ownerId = customOwnerId || generateOwnerId();

    // Add nomineeIds to nominees
    const processedNominees = (nominees || []).map(nominee => ({
        ...nominee,
        nomineeId: nominee.nomineeId || generateNomineeId(),
    }));

    // Create owner
    const owner = new Owner({
        ownerId,
        fullName,
        email: email.toLowerCase(),
        mobileNumber,
        address,
        nominees: processedNominees,
        documents,
        createdBy: req.user?.rtoId || req.user?.userId,
        roles: ['ROLE_OWNER'],
    });

    await owner.save();

    // Audit log
    await auditService.logOwnerCreated(
        req.user?.userId || 'SYSTEM',
        'ROLE_RTO',
        ownerId,
        { fullName, email, nomineesCount: processedNominees.length },
        { ipAddress: req.ip }
    );

    logger.info('Owner created:', { ownerId, email, createdBy: req.user?.userId });

    return sendCreated(res, {
        ownerId: owner.ownerId,
        fullName: owner.fullName,
        email: owner.email,
        nomineesCount: owner.nominees.length,
    }, 'Owner created successfully');
});

/**
 * Get owner by ID
 */
const getOwner = asyncHandler(async (req, res) => {
    const { ownerId } = req.params;

    const owner = await Owner.findByOwnerId(ownerId);
    if (!owner) {
        return sendNotFound(res, 'Owner not found');
    }

    return sendSuccess(res, {
        ownerId: owner.ownerId,
        fullName: owner.fullName,
        email: owner.email,
        mobileNumber: owner.mobileNumber,
        address: owner.address,
        nominees: owner.nominees,
        isActive: owner.isActive,
        createdAt: owner.createdAt,
    });
});

/**
 * List owners with pagination
 */
const listOwners = asyncHandler(async (req, res) => {
    const { page, limit, search, isActive } = req.query;

    const query = { isDeleted: false };

    if (isActive !== undefined) {
        query.isActive = isActive;
    }

    if (search) {
        query.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { mobileNumber: { $regex: search, $options: 'i' } },
        ];
    }

    const total = await Owner.countDocuments(query);
    const owners = await Owner.find(query)
        .select('ownerId fullName email mobileNumber isActive createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    return sendPaginated(res, owners, { page, limit, total });
});

/**
 * Update owner
 */
const updateOwner = asyncHandler(async (req, res) => {
    const { ownerId } = req.params;
    const updates = req.body;

    const owner = await Owner.findByOwnerId(ownerId);
    if (!owner) {
        return sendNotFound(res, 'Owner not found');
    }

    // Apply updates
    Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
            owner[key] = updates[key];
        }
    });

    await owner.save();

    logger.info('Owner updated:', { ownerId, updates: Object.keys(updates) });

    return sendSuccess(res, {
        ownerId: owner.ownerId,
        fullName: owner.fullName,
        email: owner.email,
    }, 'Owner updated successfully');
});

/**
 * Register a new vehicle
 */
const registerVehicle = asyncHandler(async (req, res) => {
    const {
        registrationNo, chassisNo, engineNo, vehicleType, fuelType,
        model, manufacturer, manufacturingYear, color, seatingCapacity,
        ownerId, deviceId, registrationDate, registrationExpiryDate,
        insuranceProvider, insurancePolicyNo, insuranceExpiryDate
    } = req.body;

    // Validate owner exists
    const owner = await Owner.findByOwnerId(ownerId);
    if (!owner) {
        return sendError(res, 'Owner not found. RTO must create owner first.', 422);
    }

    // Check for duplicate registration number
    const existingVehicle = await Vehicle.findByRegistrationNo(registrationNo);
    if (existingVehicle) {
        return sendConflict(res, 'Vehicle with this registration number already exists');
    }

    // Check chassis number uniqueness
    const existingChassis = await Vehicle.findOne({ chassisNo: chassisNo.toUpperCase(), isDeleted: false });
    if (existingChassis) {
        return sendConflict(res, 'Vehicle with this chassis number already exists');
    }

    // Start session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const vehicleId = generateVehicleId();

        // Create vehicle
        const vehicle = new Vehicle({
            vehicleId,
            registrationNo: registrationNo.toUpperCase(),
            chassisNo: chassisNo.toUpperCase(),
            engineNo: engineNo?.toUpperCase(),
            vehicleType,
            fuelType,
            model,
            manufacturer,
            manufacturingYear,
            color,
            seatingCapacity,
            currentOwnerId: ownerId,
            registrationDate: registrationDate || new Date(),
            registrationExpiryDate,
            insuranceProvider,
            insurancePolicyNo,
            insuranceExpiryDate,
            nomineesSnapshot: owner.nominees,
            registeredRtoId: req.user?.rtoId,
            createdBy: req.user?.userId,
        });

        // Bind device if provided
        if (deviceId) {
            const device = await Device.findByDeviceId(deviceId);
            if (!device) {
                throw new AppError('Device not found', 404);
            }
            if (device.lifecycleStatus !== 'ACTIVE' && device.lifecycleStatus !== 'PENDING_ACTIVATION') {
                throw new AppError(`Device cannot be bound. Current status: ${device.lifecycleStatus} (Required: ACTIVE or PENDING_ACTIVATION)`, 400);
            }
            if (device.boundVehicleId) {
                const boundVehicle = await Vehicle.findOne({ vehicleId: device.boundVehicleId });
                throw new AppError(`Device ${deviceId} is already bound to vehicle ${boundVehicle?.registrationNo || device.boundVehicleId}`, 409);
            }

            // Bind device
            device.bindToVehicle(vehicleId);
            vehicle.deviceId = deviceId;
            vehicle.deviceBoundAt = new Date();

            await device.save({ session });
        }

        await vehicle.save({ session });

        await session.commitTransaction();

        // Audit log
        await auditService.logVehicleRegistered(
            req.user?.userId || 'SYSTEM',
            'ROLE_RTO',
            vehicleId,
            { registrationNo, vehicleType, ownerId, deviceId },
            { ipAddress: req.ip }
        );

        logger.info('Vehicle registered:', { vehicleId, registrationNo, ownerId, deviceId });

        return sendCreated(res, {
            vehicleId,
            registrationNo: vehicle.registrationNo,
            ownerId,
            deviceId: vehicle.deviceId,
        }, 'Vehicle registered successfully');

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Get vehicle by ID
 */
const getVehicle = asyncHandler(async (req, res) => {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findByVehicleId(vehicleId);
    if (!vehicle) {
        return sendNotFound(res, 'Vehicle not found');
    }

    // Populate owner and device info
    const owner = await Owner.findByOwnerId(vehicle.currentOwnerId);
    const device = vehicle.deviceId ? await Device.findByDeviceId(vehicle.deviceId) : null;

    return sendSuccess(res, {
        ...vehicle.toObject(),
        owner: owner ? {
            ownerId: owner.ownerId,
            fullName: owner.fullName,
            mobileNumber: owner.mobileNumber,
        } : null,
        device: device ? {
            deviceId: device.deviceId,
            camEnabled: device.camEnabled,
            isOnline: device.isOnline,
            lifecycleStatus: device.lifecycleStatus,
        } : null,
    });
});

/**
 * List vehicles
 */
const listVehicles = asyncHandler(async (req, res) => {
    const { page, limit, search, ownerId, vehicleType, hasDevice } = req.query;

    const query = { isDeleted: false };

    // Filter by RTO if requester is RTO
    if (req.user?.roles?.includes('ROLE_RTO')) {
        query.registeredRtoId = req.user.rtoId;
    }

    if (ownerId) {
        query.currentOwnerId = ownerId;
    }

    if (vehicleType) {
        query.vehicleType = vehicleType;
    }

    if (hasDevice !== undefined) {
        if (hasDevice) {
            query.deviceId = { $exists: true, $ne: null };
        } else {
            query.deviceId = { $exists: false };
        }
    }

    if (search) {
        query.$or = [
            { registrationNo: { $regex: search, $options: 'i' } },
            { chassisNo: { $regex: search, $options: 'i' } },
            { model: { $regex: search, $options: 'i' } },
        ];
    }

    const total = await Vehicle.countDocuments(query);
    const vehicles = await Vehicle.find(query)
        .select('vehicleId registrationNo vehicleType model currentOwnerId deviceId isActive createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    return sendPaginated(res, vehicles, { page: parseInt(page), limit: parseInt(limit), total });
});

/**
 * Update vehicle details
 */
const updateVehicle = asyncHandler(async (req, res) => {
    const { vehicleId } = req.params;
    const updates = req.body;

    const vehicle = await Vehicle.findByVehicleId(vehicleId);
    if (!vehicle) {
        return sendNotFound(res, 'Vehicle not found');
    }

    // Verify RTO ownership
    if (req.user?.roles?.includes('ROLE_RTO')) {
        if (vehicle.registeredRtoId && vehicle.registeredRtoId !== req.user.rtoId) {
            return sendError(res, 'Unauthorized to update this vehicle (Registered by another RTO)', 403);
        }
    }

    // Allowed updates
    const allowedFields = ['engineNo', 'color', 'model', 'manufacturer', 'manufacturingYear', 'bodyType', 'fuelType', 'seatingCapacity', 'insuranceProvider', 'insurancePolicyNo', 'insuranceExpiryDate'];

    allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
            vehicle[field] = updates[field];
        }
    });

    await vehicle.save();

    logger.info('Vehicle updated:', { vehicleId: vehicle.vehicleId, updatedBy: req.user?.userId });

    return sendSuccess(res, vehicle, 'Vehicle updated successfully');
});

/**
 * Delete vehicle (Deregister)
 */
const deleteVehicle = asyncHandler(async (req, res) => {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findByVehicleId(vehicleId);
    if (!vehicle) {
        return sendNotFound(res, 'Vehicle not found');
    }

    // Verify RTO ownership
    if (req.user?.roles?.includes('ROLE_RTO')) {
        if (vehicle.registeredRtoId && vehicle.registeredRtoId !== req.user.rtoId) {
            return sendError(res, 'Unauthorized to delete this vehicle (Registered by another RTO)', 403);
        }
    }

    // Check if device is bound
    if (vehicle.deviceId) {
        return sendConflict(res, 'Cannot delete vehicle with active device. Please unbind device first.');
    }

    vehicle.isDeleted = true;
    vehicle.deletedAt = new Date();
    vehicle.isActive = false;
    vehicle.status = 'SCRAPPED'; // or just DELETED
    await vehicle.save();

    // Audit log
    await auditService.logVehicleDeregistered(
        req.user?.userId || 'SYSTEM',
        'ROLE_RTO',
        vehicleId,
        { reason: 'Deregistered by RTO' }
    );

    return sendSuccess(res, { message: 'Vehicle deleted successfully' });
});

/**
 * Get vehicle incident history
 */
const getVehicleIncidents = asyncHandler(async (req, res) => {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findByVehicleId(vehicleId);
    if (!vehicle) {
        return sendNotFound(res, 'Vehicle not found');
    }

    const incidents = await Incident.find({ vehicleId, isDeleted: false })
        .select('incidentId severityLevel status timestamp location aiFireDetected aiWaterSubmerged')
        .sort({ 'timestamp.serverTimestamp': -1 });

    const stats = {
        total: incidents.length,
        critical: incidents.filter(i => i.severityLevel >= 4).length,
        resolved: incidents.filter(i => i.status === 'RESOLVED').length,
    };

    return sendSuccess(res, {
        vehicleId,
        stats,
        incidents,
    });
});

/**
 * Transfer vehicle ownership
 */
const transferOwnership = asyncHandler(async (req, res) => {
    const { vehicleId } = req.params;
    const { newOwnerId, transferDate, reason } = req.body;

    // Find vehicle
    const vehicle = await Vehicle.findByVehicleId(vehicleId);
    if (!vehicle) {
        return sendNotFound(res, 'Vehicle not found');
    }

    // Validate new owner
    const newOwner = await Owner.findByOwnerId(newOwnerId);
    if (!newOwner) {
        return sendError(res, 'New owner not found', 422);
    }

    // Get previous owner info
    const previousOwner = await Owner.findByOwnerId(vehicle.currentOwnerId);
    const previousOwnerId = vehicle.currentOwnerId;

    // Add to ownership history
    vehicle.addOwnershipHistory(
        previousOwnerId,
        previousOwner?.fullName,
        reason
    );

    // Update current owner
    vehicle.currentOwnerId = newOwnerId;
    vehicle.nomineesSnapshot = newOwner.nominees;

    await vehicle.save();

    // Audit log
    await auditService.logOwnershipTransferred(
        req.user?.userId || 'SYSTEM',
        'ROLE_RTO',
        vehicleId,
        { previousOwnerId, newOwnerId, transferDate, reason },
        { ipAddress: req.ip }
    );

    logger.info('Ownership transferred:', { vehicleId, previousOwnerId, newOwnerId });

    return sendSuccess(res, {
        vehicleId,
        previousOwnerId,
        newOwnerId,
        transferDate: transferDate || new Date(),
    }, 'Ownership transferred successfully');
});

/**
 * Replace device on vehicle
 */
const replaceDevice = asyncHandler(async (req, res) => {
    const { vehicleId, oldDeviceId, newDeviceId, reason, notes } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Find vehicle
        const vehicle = await Vehicle.findByVehicleId(vehicleId);
        if (!vehicle) {
            throw new AppError('Vehicle not found', 404);
        }

        // Verify old device
        if (vehicle.deviceId !== oldDeviceId) {
            throw new AppError('Old device does not match vehicle\'s current device', 400);
        }

        const oldDevice = await Device.findByDeviceId(oldDeviceId);
        if (!oldDevice) {
            throw new AppError('Old device not found', 404);
        }

        // Find new device
        const newDevice = await Device.findByDeviceId(newDeviceId);
        if (!newDevice) {
            throw new AppError('New device not found', 404);
        }

        if (newDevice.boundVehicleId) {
            throw new AppError('New device is already bound to another vehicle', 409);
        }

        if (newDevice.lifecycleStatus !== 'ACTIVE' && newDevice.lifecycleStatus !== 'PENDING_ACTIVATION') {
            throw new AppError(`New device is ${newDevice.lifecycleStatus}`, 400);
        }

        // Unbind old device
        oldDevice.unbind();
        oldDevice.lifecycleStatus = 'REPLACED';
        await oldDevice.save({ session });

        // Bind new device
        newDevice.bindToVehicle(vehicleId);
        await newDevice.save({ session });

        // Update vehicle
        vehicle.deviceId = newDeviceId;
        vehicle.deviceBoundAt = new Date();
        await vehicle.save({ session });

        await session.commitTransaction();

        // Audit log
        await auditService.logDeviceReplaced(
            req.user?.userId || 'SYSTEM',
            'ROLE_RTO',
            vehicleId,
            { oldDeviceId, newDeviceId, reason, notes },
            { ipAddress: req.ip }
        );

        logger.info('Device replaced:', { vehicleId, oldDeviceId, newDeviceId, reason });

        return sendSuccess(res, {
            vehicleId,
            oldDeviceId,
            newDeviceId,
        }, 'Device replaced successfully');

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Get audit logs
 */
const getAuditLogs = asyncHandler(async (req, res) => {
    const { page, limit, action, targetType, targetId, actorId, startDate, endDate } = req.query;

    const query = {};

    if (action) query.action = action;
    if (targetType) query.targetType = targetType;
    if (targetId) query.targetId = targetId;
    if (actorId) query.actorId = actorId;

    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    return sendPaginated(res, logs, { page, limit, total });
});

/**
 * Create RTO staff
 */
const createStaff = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body; // role can be 'CLERK', 'OFFICER' etc.

    // Validate if user exists
    if (await User.findOne({ email })) {
        return sendError(res, 'User with this email already exists', 400);
    }

    // Determine role (default to ROLE_RTO_STAFF if not provided or restricted)
    // For now, let's stick to simple 'RTO_STAFF' or reuse 'RTO' with limited permissions in frontend
    // Or maybe we add 'ROLE_RTO_STAFF' to User model allowed roles. 
    // Assuming 'ROLE_RTO_STAFF' is valid or we just use 'RTO' but they are not the primary contact.

    const user = new User({
        email,
        password: password || 'Perseva@123',
        roles: ['ROLE_RTO_STAFF'],
        name,
        referenceId: req.user?.rtoId, // Link to same RTO
        rtoId: req.user?.rtoId,
        isActive: true,
        createdBy: req.user?.userId,
    });

    await user.save();

    logger.info('RTO staff created:', { userId: user._id, rtoId: req.user?.rtoId });

    return sendCreated(res, {
        userId: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
    });
});

module.exports = {
    createOwner,
    getOwner,
    listOwners,
    updateOwner,
    registerVehicle,
    getVehicle,
    listVehicles,
    transferOwnership,
    replaceDevice,
    getAuditLogs,
    updateVehicle,
    deleteVehicle,
    getVehicleIncidents,
    createStaff,
};
