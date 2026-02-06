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
    }

    if (state) query.state = state;

    const total = await LocalAuthority.countDocuments(query);
    const authorities = await LocalAuthority.find(query)
        .select('authorityId name district state availableEmployees incidentsHandled location')
        .sort({ state: 1, district: 1 })
        .skip((page - 1) * limit)
        .limit(limit);

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
    const { name, code, district, state, location, contactEmail, contactPhone, address, emergencyNumbers, password } = req.body;

    // Check if user exists
    if (await User.findOne({ email: contactEmail })) {
        return sendError(res, 'User with this email already exists', 400);
    }

    const authorityId = generateAuthorityId();
    // If created by Admin, find StateAuthority by state name
    let stateAuthorityId = req.user?.referenceId;
    if (req.user?.roles?.includes('ROLE_ADMIN')) {
        const stateAuth = await StateAuthority.findOne({ state, isDeleted: false });
        if (stateAuth) {
            stateAuthorityId = stateAuth.stateId;
        } else {
            // Optional: warn or error if state authority doesn't exist? 
            // For now, proceed. Admin might be creating LA before State Auth (unlikely but possible)
            logger.warn(`Admin creating LA for state '${state}' but no StateAuthority found.`);
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
            coordinates: [location.lon || 0, location.lat || 0],
        },
        contactEmail,
        contactPhone,
        address,
        emergencyNumbers,
        stateAuthorityId,
        regionGeoFence: req.body.regionGeoFence, // Optional: Pass if provided
        createdBy: req.user?.userId,
    });

    // Create User for Local Authority Admin
    const user = new User({
        email: contactEmail,
        password: password || 'Perseva@123',
        roles: ['ROLE_LOCAL_AUTH'],
        name,
        referenceId: authorityId,
        authorityId: authorityId, // Also set specific ID field
        isActive: true,
        // If created by State, link stateId
        stateId: req.user?.roles?.includes('ROLE_STATE_AUTH') ? req.user.referenceId : undefined,
    });

    await Promise.all([authority.save(), user.save()]);

    logger.info('Local authority created:', { authorityId: authority.authorityId, name, createdBy: req.user?.userId });

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
    const { name, code, district, state, contactEmail, contactPhone, address, emergencyNumbers } = req.body;

    // Check if LA exists
    const authority = await LocalAuthority.findOne({ authorityId, isDeleted: false });
    if (!authority) return sendNotFound(res, 'Local Authority not found');

    // If requester is SLA, verify ownership
    if (req.user.roles.includes('ROLE_STATE_AUTH')) {
        if (authority.stateAuthorityId && authority.stateAuthorityId !== req.user.referenceId) {
            return sendError(res, 'Unauthorized to update this authority', 403);
        }
    }

    if (name) authority.name = name;
    if (code) authority.code = code;
    if (district) authority.district = district;
    if (state) authority.state = state;
    if (contactEmail) authority.contactEmail = contactEmail;
    if (contactPhone) authority.contactPhone = contactPhone;
    if (address) authority.address = address;
    if (emergencyNumbers) authority.emergencyNumbers = emergencyNumbers;

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

module.exports = { getRiskZones, getIncidents, getAuthorities, getStatistics, createLocalAuthority, updateLocalAuthority, deleteLocalAuthority };
