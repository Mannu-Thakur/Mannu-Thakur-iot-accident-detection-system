/**
 * AuditLog Model
 * Immutable audit trail for legal compliance
 */
const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    // Actor info
    actorId: {
        type: String,
        required: true,
        index: true,
    },
    actorRole: {
        type: String,
        required: true,
        enum: ['ROLE_RTO', 'ROLE_OWNER', 'ROLE_LOCAL_AUTH', 'ROLE_STATE_AUTH', 'ROLE_EMPLOYEE', 'ROLE_DEVICE', 'ROLE_ADMIN', 'SYSTEM'],
    },
    actorName: {
        type: String,
    },

    // Action details
    action: {
        type: String,
        required: true,
        index: true,
    },

    // Target info
    targetType: {
        type: String,
        required: true,
        enum: [
            'OWNER',
            'VEHICLE',
            'DEVICE',
            'INCIDENT',
            'LIVE_ACCESS_REQUEST',
            'RESCUE_TASK',
            'EMPLOYEE',
            'LOCAL_AUTHORITY',
            'RTO',
            'STATE_AUTHORITY',
            'SYSTEM',
        ],
        index: true,
    },
    targetId: {
        type: String,
        index: true,
    },

    // Additional metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
    },

    // Before/after state for changes
    previousState: {
        type: mongoose.Schema.Types.Mixed,
    },
    newState: {
        type: mongoose.Schema.Types.Mixed,
    },

    // Request context
    ipAddress: {
        type: String,
    },
    userAgent: {
        type: String,
    },
    requestId: {
        type: String,
    },

    // Status
    success: {
        type: Boolean,
        default: true,
    },
    errorMessage: {
        type: String,
    },

    // Timestamp (immutable)
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, {
    // Disable _id generation to reduce storage
    // Actually we need _id for queries
    timestamps: false,
    // Make collection append-only (no updates/deletes in application code)
    strict: true,
});

// Indexes for common queries
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

// Compound index for filtering
AuditLogSchema.index({ actorRole: 1, action: 1, createdAt: -1 });

// Static methods for creating audit logs (factory pattern)
AuditLogSchema.statics.log = async function (data) {
    const auditLog = new this(data);
    return auditLog.save();
};

AuditLogSchema.statics.logOwnerCreated = function (actorId, actorRole, ownerId, ownerData, context = {}) {
    return this.log({
        actorId,
        actorRole,
        action: 'OWNER_CREATED',
        targetType: 'OWNER',
        targetId: ownerId,
        metadata: ownerData,
        ...context,
    });
};

AuditLogSchema.statics.logVehicleRegistered = function (actorId, actorRole, vehicleId, vehicleData, context = {}) {
    return this.log({
        actorId,
        actorRole,
        action: 'VEHICLE_REGISTERED',
        targetType: 'VEHICLE',
        targetId: vehicleId,
        metadata: vehicleData,
        ...context,
    });
};

AuditLogSchema.statics.logOwnershipTransferred = function (actorId, actorRole, vehicleId, transferData, context = {}) {
    return this.log({
        actorId,
        actorRole,
        action: 'OWNERSHIP_TRANSFERRED',
        targetType: 'VEHICLE',
        targetId: vehicleId,
        metadata: transferData,
        ...context,
    });
};

AuditLogSchema.statics.logDeviceReplaced = function (actorId, actorRole, vehicleId, deviceData, context = {}) {
    return this.log({
        actorId,
        actorRole,
        action: 'DEVICE_REPLACED',
        targetType: 'DEVICE',
        targetId: deviceData.newDeviceId,
        metadata: deviceData,
        ...context,
    });
};

AuditLogSchema.statics.logIncidentCreated = function (deviceId, incidentId, incidentData, context = {}) {
    return this.log({
        actorId: deviceId,
        actorRole: 'ROLE_DEVICE',
        action: 'INCIDENT_CREATED',
        targetType: 'INCIDENT',
        targetId: incidentId,
        metadata: incidentData,
        ...context,
    });
};

AuditLogSchema.statics.logLiveAccessRequested = function (actorId, actorRole, requestId, requestData, context = {}) {
    return this.log({
        actorId,
        actorRole,
        action: 'LIVE_ACCESS_REQUESTED',
        targetType: 'LIVE_ACCESS_REQUEST',
        targetId: requestId,
        metadata: requestData,
        ...context,
    });
};

AuditLogSchema.statics.logLiveAccessCancelled = function (actorId, actorRole, requestId, cancelData, context = {}) {
    return this.log({
        actorId,
        actorRole,
        action: 'LIVE_ACCESS_CANCELLED',
        targetType: 'LIVE_ACCESS_REQUEST',
        targetId: requestId,
        metadata: cancelData,
        ...context,
    });
};

AuditLogSchema.statics.logLiveAccessGranted = function (requestId, grantData, context = {}) {
    return this.log({
        actorId: 'SYSTEM',
        actorRole: 'SYSTEM',
        action: 'LIVE_ACCESS_GRANTED',
        targetType: 'LIVE_ACCESS_REQUEST',
        targetId: requestId,
        metadata: grantData,
        ...context,
    });
};

AuditLogSchema.statics.logTaskAssigned = function (actorId, actorRole, taskId, taskData, context = {}) {
    return this.log({
        actorId,
        actorRole,
        action: 'TASK_ASSIGNED',
        targetType: 'RESCUE_TASK',
        targetId: taskId,
        metadata: taskData,
        ...context,
    });
};

AuditLogSchema.statics.logAIAnalysisCompleted = function (incidentId, aiData, context = {}) {
    return this.log({
        actorId: 'AI_SYSTEM',
        actorRole: 'SYSTEM',
        action: 'AI_ANALYSIS_COMPLETED',
        targetType: 'INCIDENT',
        targetId: incidentId,
        metadata: aiData,
        ...context,
    });
};

AuditLogSchema.statics.logNomineesNotified = function (incidentId, notificationData, context = {}) {
    return this.log({
        actorId: 'SYSTEM',
        actorRole: 'SYSTEM',
        action: 'NOMINEES_NOTIFIED',
        targetType: 'INCIDENT',
        targetId: incidentId,
        metadata: notificationData,
        ...context,
    });
};

// Query methods
AuditLogSchema.statics.findByActor = function (actorId, limit = 100) {
    return this.find({ actorId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

AuditLogSchema.statics.findByTarget = function (targetType, targetId, limit = 100) {
    return this.find({ targetType, targetId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

AuditLogSchema.statics.findByAction = function (action, limit = 100) {
    return this.find({ action })
        .sort({ createdAt: -1 })
        .limit(limit);
};

AuditLogSchema.statics.findByDateRange = function (startDate, endDate, filters = {}, limit = 1000) {
    return this.find({
        createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
        },
        ...filters,
    })
        .sort({ createdAt: -1 })
        .limit(limit);
};

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

module.exports = AuditLog;
