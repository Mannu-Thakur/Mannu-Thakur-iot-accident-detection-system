/**
 * Vehicle Model
 * Vehicle registration with ownership tracking and device binding
 */
const mongoose = require('mongoose');
const { generateVehicleId } = require('../utils/idGenerator');

// Ownership history subdocument
const OwnershipHistorySchema = new mongoose.Schema({
    ownerId: {
        type: String,
        required: true,
    },
    ownerName: String,
    fromDate: {
        type: Date,
        required: true,
    },
    toDate: Date,
    toDate: Date,
    transferReason: String,
}, { _id: false });

// Vehicle schema
const VehicleSchema = new mongoose.Schema({
    vehicleId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: generateVehicleId,
    },
    registrationNo: {
        type: String,
        required: [true, 'Registration number is required'],
        unique: true,
        uppercase: true,
        trim: true,
        index: true,
    },
    chassisNo: {
        type: String,
        required: [true, 'Chassis number is required'],
        uppercase: true,
        trim: true,
        index: true,
    },
    engineNo: {
        type: String,
        uppercase: true,
        trim: true,
    },

    // Vehicle specifications
    vehicleType: {
        type: String,
        required: [true, 'Vehicle type is required'],
        enum: ['CAR', 'TRUCK', 'BIKE', 'BUS', 'AUTO', 'OTHER'],
        index: true,
    },
    fuelType: {
        type: String,
        enum: ['PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID', 'OTHER'],
    },
    model: {
        type: String,
        trim: true,
    },
    manufacturer: {
        type: String,
        trim: true,
    },
    manufacturingYear: {
        type: Number,
        min: [1900, 'Invalid manufacturing year'],
        max: [new Date().getFullYear() + 1, 'Invalid manufacturing year'],
    },
    color: {
        type: String,
        trim: true,
    },
    seatingCapacity: {
        type: Number,
        min: 1,
    },

    // Owner linkage (references Owner.ownerId)
    currentOwnerId: {
        type: String,
        required: [true, 'Owner ID is required'],
        index: true,
    },

    // Device binding (references Device.deviceId)
    deviceId: {
        type: String,
        index: true,
        sparse: true,
    },
    deviceBoundAt: {
        type: Date,
    },

    // Snapshot of nominees for quick access during incidents
    nomineesSnapshot: [{
        nomineeId: String,
        name: String,
        phone: String,
        address: String,
        isPrimary: Boolean,
    }],

    // Ownership history
    ownershipHistory: {
        type: [OwnershipHistorySchema],
        default: [],
    },

    // RTO info
    registeredRtoId: {
        type: String,
        index: true,
    },
    registrationDate: {
        type: Date,
        required: [true, 'Registration date is required'],
        default: Date.now,
    },
    registrationExpiryDate: {
        type: Date,
    },

    // Insurance info
    insuranceProvider: String,
    insurancePolicyNo: String,
    insuranceExpiryDate: Date,

    // State flags
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'TRANSFER_PENDING', 'SUSPENDED', 'SCRAPPED'],
        default: 'ACTIVE',
        index: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deletedAt: Date,

    // Created by (RTO officer)
    createdBy: String,
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Compound indexes
VehicleSchema.index({ chassisNo: 1, engineNo: 1 });
VehicleSchema.index({ currentOwnerId: 1, isDeleted: 1 });
VehicleSchema.index({ deviceId: 1, isDeleted: 1 });
VehicleSchema.index({ registrationNo: 'text', model: 'text', manufacturer: 'text' });

// Virtual for owner
VehicleSchema.virtual('owner', {
    ref: 'Owner',
    localField: 'currentOwnerId',
    foreignField: 'ownerId',
    justOne: true,
});

// Virtual for device
VehicleSchema.virtual('device', {
    ref: 'Device',
    localField: 'deviceId',
    foreignField: 'deviceId',
    justOne: true,
});

// Instance methods
VehicleSchema.methods.hasDevice = function () {
    return !!this.deviceId;
};

VehicleSchema.methods.bindDevice = function (deviceId) {
    this.deviceId = deviceId;
    this.deviceBoundAt = new Date();
};

VehicleSchema.methods.unbindDevice = function () {
    const previousDeviceId = this.deviceId;
    this.deviceId = undefined;
    this.deviceBoundAt = undefined;
    return previousDeviceId;
};

VehicleSchema.methods.addOwnershipHistory = function (previousOwnerId, previousOwnerName, reason = '') {
    this.ownershipHistory.push({
        ownerId: previousOwnerId,
        ownerName: previousOwnerName,
        fromDate: this.ownershipHistory.length > 0
            ? this.ownershipHistory[this.ownershipHistory.length - 1].toDate || this.createdAt
            : this.createdAt,
        toDate: new Date(),
        transferReason: reason,
    });
};

// Static methods
VehicleSchema.statics.findByVehicleId = function (vehicleId) {
    return this.findOne({ vehicleId, isDeleted: false });
};

VehicleSchema.statics.findByRegistrationNo = function (registrationNo) {
    return this.findOne({ registrationNo: registrationNo.toUpperCase(), isDeleted: false });
};

VehicleSchema.statics.findByDeviceId = function (deviceId) {
    return this.findOne({ deviceId, isDeleted: false });
};

VehicleSchema.statics.findByOwnerId = function (ownerId) {
    return this.find({ currentOwnerId: ownerId, isDeleted: false });
};

const Vehicle = mongoose.model('Vehicle', VehicleSchema);

module.exports = Vehicle;
