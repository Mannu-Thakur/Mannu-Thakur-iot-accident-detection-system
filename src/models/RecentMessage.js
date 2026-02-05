/**
 * RecentMessage Model
 * TTL-indexed collection for deduplication
 */
const mongoose = require('mongoose');

const RecentMessageSchema = new mongoose.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    deviceId: {
        type: String,
        required: true,
        index: true,
    },
    incidentId: {
        type: String,
        index: true,
    },
    imageHash: {
        type: String,
        index: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400, // TTL: 24 hours
    },
}, {
    timestamps: false,
});

// Compound index for dedup queries
RecentMessageSchema.index({ deviceId: 1, imageHash: 1 });
RecentMessageSchema.index({ deviceId: 1, createdAt: -1 });

// Static methods
RecentMessageSchema.statics.checkDuplicate = async function (messageId, imageHash, deviceId, windowMs = 300000) {
    // Check by messageId first (primary)
    if (messageId) {
        const byMessageId = await this.findOne({ messageId });
        if (byMessageId) {
            return {
                isDuplicate: true,
                incidentId: byMessageId.incidentId,
                reason: 'MESSAGE_ID',
            };
        }
    }

    // Check by imageHash with time window
    if (imageHash) {
        const windowStart = new Date(Date.now() - windowMs);
        const byImageHash = await this.findOne({
            imageHash,
            deviceId,
            createdAt: { $gte: windowStart },
        });
        if (byImageHash) {
            return {
                isDuplicate: true,
                incidentId: byImageHash.incidentId,
                reason: 'IMAGE_HASH',
            };
        }
    }

    return { isDuplicate: false };
};

RecentMessageSchema.statics.recordMessage = function (messageId, deviceId, incidentId, imageHash = null) {
    return this.create({
        messageId,
        deviceId,
        incidentId,
        imageHash,
        createdAt: new Date(),
    });
};

const RecentMessage = mongoose.model('RecentMessage', RecentMessageSchema);

module.exports = RecentMessage;
