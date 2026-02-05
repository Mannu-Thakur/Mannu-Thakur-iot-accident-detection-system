/**
 * LiveAccessRequest Model
 * Live preview handshake between LA and device/owner
 */
const mongoose = require('mongoose');
const { generateRequestId } = require('../utils/idGenerator');

const LiveAccessRequestSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: generateRequestId,
    },

    // References
    incidentId: {
        type: String,
        required: true,
        index: true,
    },
    deviceId: {
        type: String,
        required: true,
        index: true,
    },
    vehicleId: {
        type: String,
        required: true,
    },
    ownerId: {
        type: String,
        required: true,
    },
    authorityId: {
        type: String,
        required: true,
        index: true,
    },

    // Request reason
    reason: {
        type: String,
        trim: true,
        maxlength: 500,
    },

    // Request status
    status: {
        type: String,
        enum: ['PENDING', 'GRANTED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
        default: 'PENDING',
        index: true,
    },

    // Timing
    requestedAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true,
    },
    sentToDeviceAt: {
        type: Date,
    },
    deviceAckAt: {
        type: Date,
    },
    grantedAt: {
        type: Date,
    },
    cancelledAt: {
        type: Date,
    },
    expiredAt: {
        type: Date,
    },

    // Cancellation details
    cancelledBy: {
        type: String, // 'OWNER_DEVICE', 'OWNER_APP', 'AUTHORITY', 'SYSTEM'
    },
    cancelReason: {
        type: String,
    },

    // Stream token (issued when GRANTED)
    streamToken: {
        type: String,
        select: false, // Don't return by default
    },
    streamTokenExpiresAt: {
        type: Date,
    },

    // Stream tracking
    streamStartedAt: {
        type: Date,
    },
    streamEndedAt: {
        type: Date,
    },
    streamDurationSeconds: {
        type: Number,
    },

    // Granted to socket
    grantedToSocketId: {
        type: String,
    },

    // Device online when requested
    deviceWasOnline: {
        type: Boolean,
    },

    // Fallback notification sent
    fallbackNotificationSent: {
        type: Boolean,
        default: false,
    },
    fallbackNotificationSentAt: {
        type: Date,
    },

    // Officer who requested
    requestedBy: {
        type: String, // Officer/user ID
    },

    // Metadata
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Indexes
LiveAccessRequestSchema.index({ status: 1, expiresAt: 1 });
LiveAccessRequestSchema.index({ authorityId: 1, status: 1 });
LiveAccessRequestSchema.index({ deviceId: 1, status: 1 });

// Virtual for incident
LiveAccessRequestSchema.virtual('incident', {
    ref: 'Incident',
    localField: 'incidentId',
    foreignField: 'incidentId',
    justOne: true,
});

// Instance methods
LiveAccessRequestSchema.methods.markSentToDevice = function () {
    this.sentToDeviceAt = new Date();
};

LiveAccessRequestSchema.methods.markDeviceAck = function () {
    this.deviceAckAt = new Date();
};

LiveAccessRequestSchema.methods.grant = function (streamToken, socketId = null) {
    this.status = 'GRANTED';
    this.grantedAt = new Date();
    this.streamToken = streamToken;
    this.streamTokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    if (socketId) {
        this.grantedToSocketId = socketId;
    }
};

LiveAccessRequestSchema.methods.cancel = function (cancelledBy, reason = '') {
    this.status = 'CANCELLED';
    this.cancelledAt = new Date();
    this.cancelledBy = cancelledBy;
    this.cancelReason = reason;
};

LiveAccessRequestSchema.methods.expire = function () {
    this.status = 'EXPIRED';
    this.expiredAt = new Date();
};

LiveAccessRequestSchema.methods.startStream = function () {
    this.streamStartedAt = new Date();
};

LiveAccessRequestSchema.methods.endStream = function () {
    this.streamEndedAt = new Date();
    if (this.streamStartedAt) {
        this.streamDurationSeconds = Math.floor(
            (this.streamEndedAt - this.streamStartedAt) / 1000
        );
    }
};

LiveAccessRequestSchema.methods.markFallbackSent = function () {
    this.fallbackNotificationSent = true;
    this.fallbackNotificationSentAt = new Date();
};

LiveAccessRequestSchema.methods.isExpired = function () {
    return new Date() > this.expiresAt;
};

LiveAccessRequestSchema.methods.isPending = function () {
    return this.status === 'PENDING';
};

// Static methods
LiveAccessRequestSchema.statics.findByRequestId = function (requestId) {
    return this.findOne({ requestId });
};

LiveAccessRequestSchema.statics.findPendingByDevice = function (deviceId) {
    return this.findOne({
        deviceId,
        status: 'PENDING',
        expiresAt: { $gt: new Date() },
    });
};

LiveAccessRequestSchema.statics.findPendingExpired = function () {
    return this.find({
        status: 'PENDING',
        expiresAt: { $lte: new Date() },
    });
};

LiveAccessRequestSchema.statics.findByAuthority = function (authorityId, filters = {}) {
    return this.find({
        authorityId,
        ...filters,
    }).sort({ requestedAt: -1 });
};

LiveAccessRequestSchema.statics.findActiveByIncident = function (incidentId) {
    return this.findOne({
        incidentId,
        status: { $in: ['PENDING', 'GRANTED'] },
    });
};

const LiveAccessRequest = mongoose.model('LiveAccessRequest', LiveAccessRequestSchema);

module.exports = LiveAccessRequest;
