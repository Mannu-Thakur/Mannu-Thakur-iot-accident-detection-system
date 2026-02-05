/**
 * Owner Controller
 * Handles owner operations: profile, vehicles, nominees
 */
const { Owner, Vehicle, Incident } = require('../models');
const { generateNomineeId } = require('../utils/idGenerator');
const logger = require('../utils/logger');
const { sendSuccess, sendNotFound, sendPaginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get owner profile
 */
const getProfile = asyncHandler(async (req, res) => {
    const { ownerId } = req.user;

    const owner = await Owner.findByOwnerId(ownerId);
    if (!owner) {
        return sendNotFound(res, 'Owner profile not found');
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
 * Get owner's vehicles
 */
const getVehicles = asyncHandler(async (req, res) => {
    const { ownerId } = req.user;

    const vehicles = await Vehicle.findByOwnerId(ownerId);

    return sendSuccess(res, vehicles.map(v => ({
        vehicleId: v.vehicleId,
        registrationNo: v.registrationNo,
        vehicleType: v.vehicleType,
        model: v.model,
        manufacturer: v.manufacturer,
        deviceId: v.deviceId,
        hasDevice: !!v.deviceId,
        isActive: v.isActive,
    })));
});

/**
 * Update nominees
 */
const updateNominees = asyncHandler(async (req, res) => {
    const { ownerId } = req.user;
    const { nominees } = req.body;

    const owner = await Owner.findByOwnerId(ownerId);
    if (!owner) {
        return sendNotFound(res, 'Owner profile not found');
    }

    // Process nominees - add IDs to new ones
    const processedNominees = nominees.map(nominee => ({
        ...nominee,
        nomineeId: nominee.nomineeId || generateNomineeId(),
    }));

    owner.nominees = processedNominees;
    await owner.save();

    // Update nominee snapshots in vehicles
    const vehicles = await Vehicle.findByOwnerId(ownerId);
    for (const vehicle of vehicles) {
        vehicle.nomineesSnapshot = processedNominees;
        await vehicle.save();
    }

    logger.info('Nominees updated:', { ownerId, count: processedNominees.length });

    return sendSuccess(res, {
        nominees: owner.nominees,
        updatedVehicles: vehicles.length,
    }, 'Nominees updated successfully');
});

/**
 * Get incident summaries
 */
const getIncidents = asyncHandler(async (req, res) => {
    const { ownerId } = req.user;
    const { page, limit, status, vehicleId } = req.query;

    // Get owner's vehicles
    const vehicles = await Vehicle.findByOwnerId(ownerId);
    const vehicleIds = vehicles.map(v => v.vehicleId);

    if (vehicleIds.length === 0) {
        return sendPaginated(res, [], { page, limit, total: 0 });
    }

    const query = {
        vehicleId: vehicleId ? vehicleId : { $in: vehicleIds },
        isDeleted: false,
    };

    if (status) query.status = status;

    const total = await Incident.countDocuments(query);
    const incidents = await Incident.find(query)
        .select('incidentId vehicleId timestamp location severityLevel status imageUrl')
        .sort({ 'timestamp.serverTimestamp': -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    // Enrich with vehicle registration numbers
    const vehicleMap = vehicles.reduce((acc, v) => {
        acc[v.vehicleId] = v.registrationNo;
        return acc;
    }, {});

    const enrichedIncidents = incidents.map(inc => ({
        ...inc.toObject(),
        registrationNo: vehicleMap[inc.vehicleId],
    }));

    return sendPaginated(res, enrichedIncidents, { page, limit, total });
});

module.exports = {
    getProfile,
    getVehicles,
    updateNominees,
    getIncidents,
};
