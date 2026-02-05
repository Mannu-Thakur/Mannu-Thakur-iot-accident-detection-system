/**
 * Owner Model
 * RTO-created owner records with embedded nominees for emergency contacts
 */
const mongoose = require('mongoose');
const { generateOwnerId, generateNomineeId } = require('../utils/idGenerator');

// Nominee subdocument schema
const NomineeSchema = new mongoose.Schema({
    nomineeId: {
        type: String,
        required: true,
        default: generateNomineeId,
    },
    name: {
        type: String,
        required: [true, 'Nominee name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    phone: {
        type: String,
        required: [true, 'Nominee phone is required'],
        trim: true,
    },
    address: {
        type: String,
        trim: true,
        maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    relation: {
        type: String,
        trim: true,
        enum: ['SPOUSE', 'PARENT', 'SIBLING', 'CHILD', 'FRIEND', 'OTHER'],
    },
    isPrimary: {
        type: Boolean,
        default: false,
    },
}, { _id: false });

// Owner schema
const OwnerSchema = new mongoose.Schema({
    ownerId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: generateOwnerId,
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    mobileNumber: {
        type: String,
        required: [true, 'Mobile number is required'],
        trim: true,
    },
    address: {
        type: String,
        trim: true,
        maxlength: [500, 'Address cannot exceed 500 characters'],
    },

    // Emergency contacts
    nominees: {
        type: [NomineeSchema],
        default: [],
        validate: {
            validator: function (nominees) {
                return nominees.length <= 5;
            },
            message: 'Cannot have more than 5 nominees',
        },
    },

    // Role assignments (for RBAC)
    roles: {
        type: [String],
        default: ['ROLE_OWNER'],
        enum: ['ROLE_OWNER', 'ROLE_RTO', 'ROLE_LOCAL_AUTH', 'ROLE_STATE_AUTH', 'ROLE_EMPLOYEE', 'ROLE_ADMIN'],
    },

    // User ID for authentication linking
    userId: {
        type: String,
        index: true,
        sparse: true,
    },

    // Document references (for KYC)
    documents: [{
        type: {
            type: String,
            enum: ['AADHAAR', 'PAN', 'DL', 'PASSPORT', 'OTHER'],
        },
        number: String,
        url: String,
        verifiedAt: Date,
    }],

    // Created by (RTO officer)
    createdBy: {
        type: String,
        index: true,
    },

    // State flags
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deletedAt: {
        type: Date,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Indexes
OwnerSchema.index({ fullName: 'text' });
OwnerSchema.index({ isDeleted: 1, isActive: 1 });

// Virtual for vehicles
OwnerSchema.virtual('vehicles', {
    ref: 'Vehicle',
    localField: 'ownerId',
    foreignField: 'currentOwnerId',
});

// Pre-save middleware to ensure only one primary nominee
OwnerSchema.pre('save', function (next) {
    if (this.nominees && this.nominees.length > 0) {
        const primaryCount = this.nominees.filter(n => n.isPrimary).length;
        if (primaryCount > 1) {
            // Keep only the first primary
            let foundPrimary = false;
            this.nominees.forEach(n => {
                if (n.isPrimary && foundPrimary) {
                    n.isPrimary = false;
                } else if (n.isPrimary) {
                    foundPrimary = true;
                }
            });
        }
    }
    next();
});

// Instance methods
OwnerSchema.methods.getPrimaryNominee = function () {
    return this.nominees.find(n => n.isPrimary) || this.nominees[0] || null;
};

OwnerSchema.methods.getAllNomineePhones = function () {
    return this.nominees.map(n => n.phone).filter(Boolean);
};

// Static methods
OwnerSchema.statics.findByOwnerId = function (ownerId) {
    return this.findOne({ ownerId, isDeleted: false });
};

OwnerSchema.statics.findActiveOwners = function (query = {}) {
    return this.find({ ...query, isDeleted: false, isActive: true });
};

const Owner = mongoose.model('Owner', OwnerSchema);

module.exports = Owner;
