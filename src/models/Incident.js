/**
 * Incident Model
 * Incident with dual timestamps, AI-computed fields, and owner snapshot
 */
const mongoose = require('mongoose');
const { generateIncidentId } = require('../utils/idGenerator');

// Dual timestamp subdocument
const DualTimestampSchema = new mongoose.Schema({
    senderTimestamp: {
        type: Date,
        required: true,
    },
    serverTimestamp: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });

// Owner snapshot subdocument (frozen at incident time)
const OwnerSnapshotSchema = new mongoose.Schema({
    ownerId: String,
    fullName: String,
    mobileNumber: String,
    email: String,
    nominees: [{
        nomineeId: String,
        name: String,
        phone: String,
        address: String,
        isPrimary: Boolean,
    }],
}, { _id: false });

// Incident schema
const IncidentSchema = new mongoose.Schema({
    incidentId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: generateIncidentId,
    },

    // Vehicle and device references
    vehicleId: {
        type: String,
        required: true,
        index: true,
    },
    deviceId: {
        type: String,
        required: true,
        index: true,
    },

    // Dual timestamps (device-sent and server-received)
    timestamp: {
        type: DualTimestampSchema,
        required: true,
    },

    // Location (GeoJSON Point)
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
        },
    },

    // Human-readable address (reverse geocoded)
    address: {
        type: String,
        trim: true,
    },

    // Image evidence
    imageUrl: {
        type: String,
    },
    imageHash: {
        type: String,
        index: true,
    },

    // AI-detected flags (server-computed only, null until processed)
    aiFireDetected: {
        type: Boolean,
        default: null,
    },
    aiWaterSubmerged: {
        type: Boolean,
        default: null,
    },
    aiConfidenceScore: {
        type: Number,
        min: 0,
        max: 1,
        default: null,
    },
    aiProcessedAt: {
        type: Date,
    },
    aiModelVersion: {
        type: String,
    },
    aiPatientCondition: {
        type: String,
        enum: ['UNKNOWN', 'UNINJURED', 'MINOR', 'SERIOUS', 'CRITICAL'],
        default: 'UNKNOWN',
    },

    // Device-sent sensor data
    airbagsDeployed: {
        type: Boolean,
        default: false,
    },
    isBreakFail: {
        type: Boolean,
        default: false,
    },
    isFreeFall: {
        type: Boolean,
        default: false,
    },
    speed: {
        type: Number,
        min: 0,
    },

    // Sensor trust flags (based on device attach dates)
    speedTrusted: {
        type: Boolean,
        default: false,
    },
    airbagTrusted: {
        type: Boolean,
        default: false,
    },
    brakeTrusted: {
        type: Boolean,
        default: false,
    },

    // Impact details
    impactDirection: {
        type: String,
        enum: ['FRONT', 'REAR', 'LEFT', 'RIGHT', 'ROLLOVER', 'UNKNOWN'],
        default: 'UNKNOWN',
    },
    impactForce: {
        type: Number, // G-force if available
    },

    // Connectivity used
    connectivityUsed: {
        type: String,
        enum: ['INTERNET', 'LORA'],
        default: 'INTERNET',
    },

    // Computed severity (1-5)
    severityLevel: {
        type: Number,
        min: 1,
        max: 5,
        index: true,
    },

    // Incident lifecycle status
    status: {
        type: String,
        enum: [
            'REPORTED',           // Initial state
            'AI_PROCESSING',      // AI analysis in progress
            'VERIFIED',           // Confirmed as real incident
            'FALSE_POSITIVE',     // AI/manual determined not an incident
            'DISPATCHED',         // Rescue team dispatched
            'IN_PROGRESS',        // Rescue in progress
            'RESOLVED',           // Rescue completed
            'ARCHIVED',           // Long-term storage
        ],
        default: 'REPORTED',
        index: true,
    },

    // Frozen owner info at incident time
    ownerSnapshot: {
        type: OwnerSnapshotSchema,
    },

    // Live access request reference
    liveAccessRequestId: {
        type: String,
    },

    // Rescue task reference
    rescueTaskId: {
        type: String,
    },

    // Resolution details
    resolutionReport: {
        type: String,
    },
    resolvedAt: {
        type: Date,
    },
    resolvedBy: {
        type: String, // Authority/employee ID
    },

    // Casualty information
    casualties: {
        fatalities: { type: Number, default: 0 },
        injured: { type: Number, default: 0 },
        uninjured: { type: Number, default: 0 },
    },

    // Property damage estimate
    estimatedDamage: {
        type: Number,
    },

    // Assigned authority
    assignedAuthorityId: {
        type: String,
        index: true,
    },

    // Notification tracking
    nomineesNotified: {
        type: Boolean,
        default: false,
    },
    nomineesNotifiedAt: {
        type: Date,
    },
    authorityNotified: {
        type: Boolean,
        default: false,
    },
    authorityNotifiedAt: {
        type: Date,
    },

    // Message ID for deduplication
    messageId: {
        type: String,
        index: true,
    },

    // Duplicate flag
    isDuplicate: {
        type: Boolean,
        default: false,
    },
    duplicateOfIncidentId: {
        type: String,
    },

    // Metadata
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deletedAt: Date,
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Geospatial index
IncidentSchema.index({ location: '2dsphere' });
IncidentSchema.index({ 'timestamp.serverTimestamp': -1 });
IncidentSchema.index({ status: 1, severityLevel: -1 });
IncidentSchema.index({ deviceId: 1, 'timestamp.serverTimestamp': -1 });
IncidentSchema.index({ assignedAuthorityId: 1, status: 1 });

// Virtuals
IncidentSchema.virtual('vehicle', {
    ref: 'Vehicle',
    localField: 'vehicleId',
    foreignField: 'vehicleId',
    justOne: true,
});

IncidentSchema.virtual('liveAccessRequest', {
    ref: 'LiveAccessRequest',
    localField: 'liveAccessRequestId',
    foreignField: 'requestId',
    justOne: true,
});

IncidentSchema.virtual('rescueTask', {
    ref: 'RescueTask',
    localField: 'rescueTaskId',
    foreignField: 'taskId',
    justOne: true,
});

// Instance methods
IncidentSchema.methods.markAIProcessing = function () {
    this.status = 'AI_PROCESSING';
};

IncidentSchema.methods.updateAIResults = function (results) {
    this.aiFireDetected = results.fireDetected;
    this.aiWaterSubmerged = results.waterSubmerged;
    this.aiConfidenceScore = results.confidenceScore;
    this.aiProcessedAt = new Date();
    this.aiModelVersion = results.modelVersion || 'v1.0';

    // Update status based on AI results
    if (results.confidenceScore < 0.3 && !results.fireDetected && !results.waterSubmerged) {
        this.status = 'FALSE_POSITIVE';
    } else {
        this.status = 'VERIFIED';
    }
};

IncidentSchema.methods.assignToAuthority = function (authorityId) {
    this.assignedAuthorityId = authorityId;
    this.authorityNotified = true;
    this.authorityNotifiedAt = new Date();
};

IncidentSchema.methods.markNomineesNotified = function () {
    this.nomineesNotified = true;
    this.nomineesNotifiedAt = new Date();
};

IncidentSchema.methods.dispatch = function (taskId) {
    this.status = 'DISPATCHED';
    this.rescueTaskId = taskId;
};

IncidentSchema.methods.resolve = function (report, resolvedBy) {
    this.status = 'RESOLVED';
    this.resolutionReport = report;
    this.resolvedAt = new Date();
    this.resolvedBy = resolvedBy;
};

// Static methods
IncidentSchema.statics.findByIncidentId = function (incidentId) {
    return this.findOne({ incidentId, isDeleted: false });
};

IncidentSchema.statics.findByDeviceId = function (deviceId) {
    return this.find({ deviceId, isDeleted: false }).sort({ 'timestamp.serverTimestamp': -1 });
};

IncidentSchema.statics.findByStatus = function (status) {
    return this.find({ status, isDeleted: false }).sort({ 'timestamp.serverTimestamp': -1 });
};

IncidentSchema.statics.findNearLocation = function (longitude, latitude, maxDistanceMeters = 5000) {
    return this.find({
        isDeleted: false,
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
                $maxDistance: maxDistanceMeters,
            },
        },
    });
};

IncidentSchema.statics.findByAuthority = function (authorityId, filters = {}) {
    return this.find({
        assignedAuthorityId: authorityId,
        isDeleted: false,
        ...filters,
    }).sort({ 'timestamp.serverTimestamp': -1 });
};

IncidentSchema.statics.findPendingAIProcessing = function () {
    return this.find({
        status: 'AI_PROCESSING',
        isDeleted: false,
        imageUrl: { $exists: true, $ne: null },
    });
};

const Incident = mongoose.model('Incident', IncidentSchema);

module.exports = Incident;
