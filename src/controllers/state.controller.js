/**
 * State Controller
 * State-level analytics and oversight
 */
const { Incident, LocalAuthority } = require('../models');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

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

module.exports = { getRiskZones, getIncidents, getAuthorities, getStatistics };
