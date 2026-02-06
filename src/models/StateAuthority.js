/**
 * StateAuthority Model
 * State-level authority for analytics and oversight
 */
const mongoose = require('mongoose');
const { generateStateId } = require('../utils/idGenerator');

const StateAuthoritySchema = new mongoose.Schema({
    stateId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: generateStateId,
    },

    // Basic info
    name: {
        type: String,
        required: [true, 'State name is required'],
        trim: true,
        maxlength: 200,
    },
    code: {
        type: String, // State code like "MH" for Maharashtra
        unique: true,
        sparse: true,
        trim: true,
        index: true,
    },

    state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
        index: true,
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

    // Stats
    totalLocalAuthorities: {
        type: Number,
        default: 0,
    },
    totalIncidents: {
        type: Number,
        default: 0,
    },
    totalVehicles: {
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

// Virtual for local authorities
StateAuthoritySchema.virtual('localAuthorities', {
    ref: 'LocalAuthority',
    localField: 'stateId',
    foreignField: 'stateAuthorityId',
});

// Static methods
StateAuthoritySchema.statics.findByStateId = function (stateId) {
    return this.findOne({ stateId, isDeleted: false });
};

StateAuthoritySchema.statics.findByCode = function (code) {
    return this.findOne({ code: code.toUpperCase(), isDeleted: false });
};

const StateAuthority = mongoose.model('StateAuthority', StateAuthoritySchema);

module.exports = StateAuthority;
