/**
 * Audit Service
 * Wrapper for audit logging operations
 */
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Create audit log entry
 * @param {Object} data 
 */
const createAuditLog = async (data) => {
    try {
        await AuditLog.log(data);
    } catch (error) {
        // Log error but don't throw - audit should not break main flow
        logger.error('Failed to create audit log:', error);
    }
};

/**
 * Log owner creation
 */
const logOwnerCreated = async (actorId, actorRole, ownerId, ownerData, context = {}) => {
    return AuditLog.logOwnerCreated(actorId, actorRole, ownerId, {
        fullName: ownerData.fullName,
        email: ownerData.email,
        nomineesCount: ownerData.nominees?.length || 0,
    }, context);
};

/**
 * Log vehicle registration
 */
const logVehicleRegistered = async (actorId, actorRole, vehicleId, vehicleData, context = {}) => {
    return AuditLog.logVehicleRegistered(actorId, actorRole, vehicleId, {
        registrationNo: vehicleData.registrationNo,
        vehicleType: vehicleData.vehicleType,
        ownerId: vehicleData.currentOwnerId,
        deviceId: vehicleData.deviceId,
    }, context);
};

/**
 * Log ownership transfer
 */
const logOwnershipTransferred = async (actorId, actorRole, vehicleId, transferData, context = {}) => {
    return AuditLog.logOwnershipTransferred(actorId, actorRole, vehicleId, transferData, context);
};

/**
 * Log device replacement
 */
const logDeviceReplaced = async (actorId, actorRole, vehicleId, deviceData, context = {}) => {
    return AuditLog.logDeviceReplaced(actorId, actorRole, vehicleId, deviceData, context);
};

/**
 * Log incident creation
 */
const logIncidentCreated = async (deviceId, incidentId, incidentData, context = {}) => {
    return AuditLog.logIncidentCreated(deviceId, incidentId, {
        vehicleId: incidentData.vehicleId,
        location: incidentData.location?.coordinates,
        status: incidentData.status,
    }, context);
};

/**
 * Log live access requested
 */
const logLiveAccessRequested = async (actorId, actorRole, requestId, requestData, context = {}) => {
    return AuditLog.logLiveAccessRequested(actorId, actorRole, requestId, requestData, context);
};

/**
 * Log live access cancelled
 */
const logLiveAccessCancelled = async (actorId, actorRole, requestId, cancelData, context = {}) => {
    return AuditLog.logLiveAccessCancelled(actorId, actorRole, requestId, cancelData, context);
};

/**
 * Log live access granted
 */
const logLiveAccessGranted = async (requestId, grantData, context = {}) => {
    return AuditLog.logLiveAccessGranted(requestId, grantData, context);
};

/**
 * Log task assigned
 */
const logTaskAssigned = async (actorId, actorRole, taskId, taskData, context = {}) => {
    return AuditLog.logTaskAssigned(actorId, actorRole, taskId, taskData, context);
};

/**
 * Log AI analysis completed
 */
const logAIAnalysisCompleted = async (incidentId, aiData, context = {}) => {
    return AuditLog.logAIAnalysisCompleted(incidentId, aiData, context);
};

/**
 * Log nominees notified
 */
const logNomineesNotified = async (incidentId, notificationData, context = {}) => {
    return AuditLog.logNomineesNotified(incidentId, notificationData, context);
};

/**
 * Get audit logs for a target
 */
const getAuditLogs = async (targetType, targetId, limit = 100) => {
    return AuditLog.findByTarget(targetType, targetId, limit);
};

/**
 * Get audit logs by actor
 */
const getAuditLogsByActor = async (actorId, limit = 100) => {
    return AuditLog.findByActor(actorId, limit);
};

/**
 * Get audit logs by date range
 */
const getAuditLogsByDateRange = async (startDate, endDate, filters = {}, limit = 1000) => {
    return AuditLog.findByDateRange(startDate, endDate, filters, limit);
};

module.exports = {
    createAuditLog,
    logOwnerCreated,
    logVehicleRegistered,
    logOwnershipTransferred,
    logDeviceReplaced,
    logIncidentCreated,
    logLiveAccessRequested,
    logLiveAccessCancelled,
    logLiveAccessGranted,
    logTaskAssigned,
    logAIAnalysisCompleted,
    logNomineesNotified,
    getAuditLogs,
    getAuditLogsByActor,
    getAuditLogsByDateRange,
};
