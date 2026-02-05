/**
 * RTO Model
 * Regional Transport Office entity
 */
const mongoose = require('mongoose');
const { generateRtoId } = require('../utils/idGenerator');

const RTOSchema = new mongoose.Schema({
    rtoId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: generateRtoId,
    },

    // Basic info
    name: {
        type: String,
        required: [true, 'RTO name is required'],
        trim: true,
        maxlength: 200,
    },
    code: {
        type: String, // Short code like "MH-12" for Pune
        unique: true,
        sparse: true,
        trim: true,
        index: true,
    },

    // Location
    region: {
        type: String,
        required: [true, 'Region is required'],
        trim: true,
    },
    district: {
        type: String,
        trim: true,
    },
    state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
        index: true,
    },

    // Headquarters location
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
        },
    },

    // Contact
    contactEmail: {
        type: String,
        lowercase: true,
        trim: true,
    },
    contactPhone: {
        type: String,
        trim: true,
    },
    address: {
        type: String,
        trim: true,
        maxlength: 500,
    },

    // Operating hours
    operatingHours: {
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '17:00' },
        workDays: {
            type: [String],
            default: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
        },
    },

    // Stats
    vehiclesRegistered: {
        type: Number,
        default: 0,
    },
    ownersCreated: {
        type: Number,
        default: 0,
    },
    devicesRegistered: {
        type: Number,
        default: 0,
    },

    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: Date,

    createdBy: String,
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Indexes
RTOSchema.index({ location: '2dsphere' });
RTOSchema.index({ state: 1, region: 1 });

// Instance methods
RTOSchema.methods.incrementVehicleCount = function () {
    this.vehiclesRegistered += 1;
};

RTOSchema.methods.incrementOwnerCount = function () {
    this.ownersCreated += 1;
};

RTOSchema.methods.incrementDeviceCount = function () {
    this.devicesRegistered += 1;
};

// Static methods
RTOSchema.statics.findByRtoId = function (rtoId) {
    return this.findOne({ rtoId, isDeleted: false });
};

RTOSchema.statics.findByCode = function (code) {
    return this.findOne({ code: code.toUpperCase(), isDeleted: false });
};

RTOSchema.statics.findByState = function (state) {
    return this.find({
        state,
        isActive: true,
        isDeleted: false,
    }).sort({ region: 1 });
};

const RTO = mongoose.model('RTO', RTOSchema);

module.exports = RTO;
