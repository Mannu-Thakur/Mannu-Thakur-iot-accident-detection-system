/**
 * State Controller
 * State-level analytics and oversight
 */
const { Incident, LocalAuthority, User, StateAuthority } = require('../models');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateAuthorityId } = require('../utils/idGenerator');
const logger = require('../utils/logger');

/**
 * Get risk zone analytics
 */
const getRiskZones = asyncHandler(async (req, res) => {
    const { fromDate, toDate, minIncidents = 5, gridSizeKm = 5 } = req.query;

    const startDate = new Date(fromDate || Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = new Date(toDate || Date.now());
    const gridSizeDeg = gridSizeKm / 111;

    const zones = await Incident.aggregate([
        {
            $match: {
                isDeleted: false,
                'timestamp.serverTimestamp': { $gte: startDate, $lte: endDate },
                status: { $ne: 'FALSE_POSITIVE' },
            },
        },
        {
            $group: {
                _id: {
                    gridLat: { $floor: { $divide: [{ $arrayElemAt: ['$location.coordinates', 1] }, gridSizeDeg] } },
                    gridLon: { $floor: { $divide: [{ $arrayElemAt: ['$location.coordinates', 0] }, gridSizeDeg] } },
                },
                count: { $sum: 1 },
                avgSeverity: { $avg: '$severityLevel' },
            },
        },
        { $match: { count: { $gte: parseInt(minIncidents) } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
    ]);

    return sendSuccess(res, { zones, period: { from: startDate, to: endDate } });
});

/**
 * Get state incidents
 */
const getIncidents = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, state, status, minSeverity } = req.query;

    let authorityIds = [];
    if (state) {
        const authorities = await LocalAuthority.find({ state, isDeleted: false });
        authorityIds = authorities.map(a => a.authorityId);
    }

    const query = { isDeleted: false };
    if (authorityIds.length > 0) query.assignedAuthorityId = { $in: authorityIds };
    if (status) query.status = status;
    if (minSeverity) query.severityLevel = { $gte: parseInt(minSeverity) };

    const total = await Incident.countDocuments(query);
    const incidents = await Incident.find(query)
        .select('incidentId vehicleId timestamp location severityLevel status')
        .sort({ 'timestamp.serverTimestamp': -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    return sendPaginated(res, incidents, { page: parseInt(page), limit: parseInt(limit), total });
});

/**
 * Get authorities list
 */
const getAuthorities = asyncHandler(async (req, res) => {
    let { state, page = 1, limit = 50 } = req.body;
    const query = { isDeleted: false, isActive: true };

    // If user is SLA, enforce their state
    if (req.user?.roles?.includes('ROLE_STATE_AUTH')) {
        logger.info(`Checking SLA profile for user: ${req.user.userId}, refId: ${req.user.referenceId}`);
        const sla = await StateAuthority.findOne({ stateId: req.user.referenceId });

        if (!sla) {
            logger.error(`SLA profile not found for refId: ${req.user.referenceId}`);
            return sendError(res, 'State Authority profile not found', 404);
        }
        state = sla.state;
        logger.info(`SLA state enforced: ${state}`);
    }

    if (state) query.state = state;

    logger.info(`getAuthorities query: ${JSON.stringify(query)}`);

    const total = await LocalAuthority.countDocuments(query);
    const authorities = await LocalAuthority.find(query)
        .select('authorityId name code district state availableEmployees incidentsHandled location contactEmail contactPhone')
        .sort({ state: 1, district: 1 })
        .skip((page - 1) * limit)
        .limit(limit);

    logger.info(`getAuthorities found ${authorities.length} authorities (total: ${total})`);

    return sendPaginated(res, authorities, { page: parseInt(page), limit: parseInt(limit), total });
});

/**
 * Get statistics
 */
const getStatistics = asyncHandler(async (req, res) => {
    const { state, days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let authorityIds = [];
    if (state) {
        const authorities = await LocalAuthority.find({ state, isDeleted: false });
        authorityIds = authorities.map(a => a.authorityId);
    }

    const matchQuery = { isDeleted: false, 'timestamp.serverTimestamp': { $gte: startDate } };
    if (authorityIds.length > 0) matchQuery.assignedAuthorityId = { $in: authorityIds };

    const stats = await Incident.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                avgSeverity: { $avg: '$severityLevel' },
                resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
                critical: { $sum: { $cond: [{ $gte: ['$severityLevel', 4] }, 1, 0] } },
            },
        },
    ]);

    return sendSuccess(res, stats[0] || { total: 0, avgSeverity: 0, resolved: 0, critical: 0 });
});

/**
 * Create local authority
 */
const createLocalAuthority = asyncHandler(async (req, res) => {
    let { name, code, district, state, location, contactEmail, contactPhone, address, emergencyNumbers, password } = req.body;

    // Check if user exists
    if (await User.findOne({ email: contactEmail })) {
        return sendError(res, 'User with this email already exists', 400);
    }
    // Check if authority code exists
    if (code && await LocalAuthority.findOne({ code, isDeleted: false })) {
        return sendError(res, 'Local Authority with this code already exists', 400);
    }

    const authorityId = generateAuthorityId();
    let stateAuthorityId = req.user?.referenceId;

    // Determine State & StateAuthorityId
    if (req.user?.roles?.includes('ROLE_STATE_AUTH')) {
        const sla = await StateAuthority.findOne({ stateId: req.user.referenceId });
        if (sla) {
            state = sla.state; // Enforce state for SLA
            stateAuthorityId = sla.stateId;
        }
    } else if (req.user?.roles?.includes('ROLE_ADMIN')) {
        // Admin creating LA: Try to find linked StateAuthority
        const stateAuth = await StateAuthority.findOne({ state, isDeleted: false });
        if (stateAuth) stateAuthorityId = stateAuth.stateId;
    }

    // Handle Location (GeoJSON or lat/lon)
    let coordinates = [0, 0];
    if (location) {
        if (Array.isArray(location.coordinates)) {
            coordinates = location.coordinates;
        } else if (location.lat !== undefined && location.lon !== undefined) {
            coordinates = [parseFloat(location.lon), parseFloat(location.lat)];
        }
        // If coming from frontend as { type: 'Point', coordinates: [...] } inside req.body.location
        if (location.location && Array.isArray(location.location.coordinates)) {
            coordinates = location.location.coordinates;
        }
    }

    const authority = new LocalAuthority({
        authorityId,
        name,
        code,
        district,
        state,
        location: {
            type: 'Point',
            coordinates: coordinates,
        },
        contactEmail,
        contactPhone,
        address,
        emergencyNumbers,
        stateAuthorityId,
        regionGeoFence: req.body.regionGeoFence,
        createdBy: req.user?.userId,
    });

    // Create User for Local Authority Admin
    const user = new User({
        email: contactEmail,
        password: password || 'Perseva@123',
        roles: ['ROLE_LOCAL_AUTH'],
        name,
        referenceId: authorityId,
        authorityId: authorityId,
        isActive: true,
        stateId: stateAuthorityId,
    });

    // Serial Execution with Rollback
    // 1. Save Authority first
    try {
        await authority.save();
    } catch (err) {
        logger.error(`Failed to save authority: ${err.message}`);
        return sendError(res, `Failed to create authority: ${err.message}`, 400);
    }

    // 2. Save User
    try {
        await user.save();
    } catch (err) {
        logger.error(`Failed to save user for authority ${authorityId}: ${err.message}`);
        // Rollback: Delete the authority we just created to avoid orphan/zombie state
        await LocalAuthority.deleteOne({ _id: authority._id });
        logger.info(`Rolled back authority creation for ${authorityId}`);
        return sendError(res, `Failed to create user account: ${err.message}`, 400);
    }

    logger.info('Local authority created:', { authorityId: authority.authorityId, name, state });

    return sendCreated(res, {
        authorityId: authority.authorityId,
        name: authority.name,
        district: authority.district,
        state: authority.state,
        userEmail: user.email,
    });
});

/**
 * Update Local Authority
 */
const updateLocalAuthority = asyncHandler(async (req, res) => {
    const { authorityId } = req.params;
    const { name, code, district, state, contactEmail, contactPhone, address, emergencyNumbers, location } = req.body;

    // Check if LA exists
    const authority = await LocalAuthority.findOne({ authorityId, isDeleted: false });
    if (!authority) return sendNotFound(res, 'Local Authority not found');

    // If requester is SLA, verify ownership
    if (req.user.roles.includes('ROLE_STATE_AUTH')) {
        if (authority.stateAuthorityId && authority.stateAuthorityId !== req.user.referenceId) {
            return sendError(res, 'Unauthorized to update this authority', 403);
        }
        // Prevent SLA from changing state if enforced?
        // Usually SLA cannot change state of LA easily if bound to SLA's state
    }

    if (name) authority.name = name;
    if (code) authority.code = code;
    if (district) authority.district = district;
    if (state) authority.state = state;
    if (contactEmail) authority.contactEmail = contactEmail;
    if (contactPhone) authority.contactPhone = contactPhone;
    if (address) authority.address = address;
    if (emergencyNumbers) authority.emergencyNumbers = emergencyNumbers;

    // Handle Location Update
    if (location) {
        let coordinates;
        if (Array.isArray(location.coordinates)) {
            coordinates = location.coordinates;
        } else if (location.lat !== undefined && location.lon !== undefined) {
            coordinates = [parseFloat(location.lon), parseFloat(location.lat)];
        }

        if (coordinates) {
            authority.location = {
                type: 'Point',
                coordinates: coordinates
            };
        }
    }

    await authority.save();

    // Update user
    const user = await User.findOne({ referenceId: authorityId, roles: 'ROLE_LOCAL_AUTH' });
    if (user) {
        if (name) user.name = name;
        if (contactEmail) user.email = contactEmail;
        await user.save();
    }

    return sendSuccess(res, authority);
});

/**
 * Delete Local Authority
 */
const deleteLocalAuthority = asyncHandler(async (req, res) => {
    const { authorityId } = req.params;

    const authority = await LocalAuthority.findOne({ authorityId, isDeleted: false });
    if (!authority) return sendNotFound(res, 'Local Authority not found');

    // Verify ownership for SLA
    if (req.user.roles.includes('ROLE_STATE_AUTH')) {
        if (authority.stateAuthorityId && authority.stateAuthorityId !== req.user.referenceId) {
            return sendError(res, 'Unauthorized to delete this authority', 403);
        }
    }

    authority.isDeleted = true;
    authority.deletedAt = new Date();
    await authority.save();

    // Disable user
    const user = await User.findOne({ referenceId: authorityId, roles: 'ROLE_LOCAL_AUTH' });
    if (user) {
        user.isActive = false;
        user.isDeleted = true;
        user.deletedAt = new Date();
        await user.save();
    }

    return sendSuccess(res, { message: 'Local Authority deleted successfully' });
});

/**
 * Get single authority
 */
const getAuthority = asyncHandler(async (req, res) => {
    const { authorityId } = req.params;
    const authority = await LocalAuthority.findOne({ authorityId, isDeleted: false });

    if (!authority) return sendNotFound(res, 'Local Authority not found');

    // If requester is SLA, verify ownership/state
    if (req.user.roles.includes('ROLE_STATE_AUTH')) {
        // Optional: rigorous check if LA belongs to state
        const sla = await StateAuthority.findOne({ stateId: req.user.referenceId });
        if (sla && authority.state !== sla.state) {
            return sendError(res, 'Unauthorized to view this authority', 403);
        }
    }

    return sendSuccess(res, authority);
});

/**
 * Get incidents by district
 */
const getIncidentsByDistrict = asyncHandler(async (req, res) => {
    const { state } = req.query; // Filter by state if provided

    const matchQuery = { isDeleted: false };

    // If user is SLA, enforce state
    if (req.user.roles.includes('ROLE_STATE_AUTH')) {
        const sla = await StateAuthority.findOne({ stateId: req.user.referenceId });
        if (sla) matchQuery.state = sla.state; // Assumes incident has state field or we join with LA
        // Incident schema doesn't have state directly? Check schema.
        // Incident has location. We can also filter by authorities in the state.

        const authorities = await LocalAuthority.find({ state: sla.state, isDeleted: false });
        const authIds = authorities.map(a => a.authorityId);
        matchQuery.assignedAuthorityId = { $in: authIds };
    } else if (state) {
        const authorities = await LocalAuthority.find({ state, isDeleted: false });
        const authIds = authorities.map(a => a.authorityId);
        matchQuery.assignedAuthorityId = { $in: authIds };
    }

    const stats = await Incident.aggregate([
        { $match: matchQuery },
        // Lookup authority to get district
        {
            $lookup: {
                from: 'localauthorities',
                localField: 'assignedAuthorityId',
                foreignField: 'authorityId',
                as: 'authority'
            }
        },
        { $unwind: '$authority' },
        {
            $group: {
                _id: '$authority.district',
                count: { $sum: 1 },
                avgSeverity: { $avg: '$severityLevel' },
                critical: { $sum: { $cond: [{ $gte: ['$severityLevel', 4] }, 1, 0] } }
            }
        },
        { $sort: { count: -1 } }
    ]);

    return sendSuccess(res, stats);
});

module.exports = {
    getRiskZones,
    getIncidents,
    getAuthorities,
    getAuthority, // Exported
    getStatistics,
    getIncidentsByDistrict, // Exported
    createLocalAuthority,
    updateLocalAuthority,
    deleteLocalAuthority
};
