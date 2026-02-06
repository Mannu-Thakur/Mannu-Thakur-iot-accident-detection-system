/**
 * State Controller
 * State-level analytics and oversight
 */
const { Incident, LocalAuthority, User } = require('../models');
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
    const { state } = req.query;
    const query = { isDeleted: false, isActive: true };
    if (state) query.state = state;

    const authorities = await LocalAuthority.find(query)
        .select('authorityId name district state availableEmployees incidentsHandled')
        .sort({ state: 1, district: 1 });

    return sendSuccess(res, authorities);
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
    if (req.user?.role === 'ADMIN') {
        const StateAuthorityModel = require('../models/StateAuthority'); // Dynamic require to avoid circular dependency if any
        const stateAuth = await StateAuthorityModel.findOne({ state, isDeleted: false });
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
        stateId: req.user?.role === 'STATE_AUTHORITY' ? req.user.referenceId : undefined,
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

module.exports = { getRiskZones, getIncidents, getAuthorities, getStatistics, createLocalAuthority };
