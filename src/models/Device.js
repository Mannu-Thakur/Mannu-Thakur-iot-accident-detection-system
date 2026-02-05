/**
 * Device Model
 * IoT device with sensor attach dates and real-time connection tracking
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generateDeviceId, generateApiKey } = require('../utils/idGenerator');

// Connection tracking subdocument
const ConnectionSchema = new mongoose.Schema({
    socketId: {
        type: String,
    },
    lastSeenAt: {
        type: Date,
    },
    ipAddress: {
        type: String,
    },
}, { _id: false });

// Device schema
const DeviceSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: generateDeviceId,
    },
    serialNumber: {
        type: String,
        required: [true, 'Serial number is required'],
        unique: true,
        trim: true,
        index: true,
    },
    firmwareVersion: {
        type: String,
        trim: true,
        default: '1.0.0',
    },

    // API Key for authentication (hashed)
    apiKey: {
        type: String,
        required: true,
        select: false, // Never return in queries by default
    },
    apiKeyHint: {
        type: String, // Last 4 characters for identification
    },

    // Device capabilities
    camEnabled: {
        type: Boolean,
        default: false,
    },

    // Sensor attach dates (for trust validation)
    speedometerAttachedDate: {
        type: Date,
    },
    brakeInputDate: {
        type: Date,
    },
    airbagInputDate: {
        type: Date,
    },

    // Connectivity capabilities
    internetEnabled: {
        type: Boolean,
        default: true,
    },
    loraEnabled: {
        type: Boolean,
        default: false,
    },

    // Last known state
    lastBatteryLevel: {
        type: Number,
        min: 0,
        max: 100,
    },
    lastHeartbeat: {
        type: Date,
        index: true,
    },
    lastLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0],
        },
    },

    // Lifecycle status
    lifecycleStatus: {
        type: String,
        enum: ['ACTIVE', 'FAULTY', 'REPLACED', 'DECOMMISSIONED', 'PENDING_ACTIVATION'],
        default: 'PENDING_ACTIVATION',
        index: true,
    },

    // Vehicle binding
    boundVehicleId: {
        type: String,
        index: true,
        sparse: true,
    },
    boundAt: {
        type: Date,
    },

    // Real-time connection tracking
    connection: {
        type: ConnectionSchema,
        default: () => ({}),
    },

    // Online status (derived from heartbeat)
    isOnline: {
        type: Boolean,
        default: false,
        index: true,
    },

    // Maintenance info
    lastMaintenanceDate: Date,
    nextMaintenanceDate: Date,
    maintenanceNotes: String,

    // Metadata
    manufacturer: String,
    model: String,
    purchaseDate: Date,
    warrantyExpiryDate: Date,

    // State flags
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deletedAt: Date,

    // Created by (admin/RTO)
    createdBy: String,
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Geospatial index for location
DeviceSchema.index({ lastLocation: '2dsphere' });
DeviceSchema.index({ boundVehicleId: 1, lifecycleStatus: 1 });
DeviceSchema.index({ isOnline: 1, lifecycleStatus: 1 });

// Virtual for vehicle
DeviceSchema.virtual('vehicle', {
    ref: 'Vehicle',
    localField: 'boundVehicleId',
    foreignField: 'vehicleId',
    justOne: true,
});

// Pre-save middleware to hash API key
DeviceSchema.pre('save', async function (next) {
    if (this.isModified('apiKey') && this.apiKey && !this.apiKey.startsWith('$2')) {
        // Store hint (last 4 chars) before hashing
        this.apiKeyHint = this.apiKey.slice(-4);
        this.apiKey = await bcrypt.hash(this.apiKey, 10);
    }
    next();
});

// Instance methods
DeviceSchema.methods.validateApiKey = async function (candidateKey) {
    const device = await mongoose.model('Device').findById(this._id).select('+apiKey');
    if (!device || !device.apiKey) return false;
    return bcrypt.compare(candidateKey, device.apiKey);
};

DeviceSchema.methods.isSensorTrusted = function (sensorType, eventTimestamp) {
    const attachDateField = {
        'speed': 'speedometerAttachedDate',
        'brake': 'brakeInputDate',
        'airbag': 'airbagInputDate',
    }[sensorType];

    if (!attachDateField || !this[attachDateField]) {
        return false;
    }

    return this[attachDateField] <= new Date(eventTimestamp);
};

DeviceSchema.methods.updateHeartbeat = function (batteryLevel, location, socketId = null) {
    this.lastHeartbeat = new Date();
    this.isOnline = true;

    if (batteryLevel !== undefined) {
        this.lastBatteryLevel = batteryLevel;
    }

    if (location && location.lat !== undefined && location.lon !== undefined) {
        this.lastLocation = {
            type: 'Point',
            coordinates: [location.lon, location.lat],
        };
    }

    if (socketId) {
        this.connection.socketId = socketId;
        this.connection.lastSeenAt = new Date();
    }
};

DeviceSchema.methods.setOffline = function () {
    this.isOnline = false;
    this.connection.socketId = null;
};

DeviceSchema.methods.bindToVehicle = function (vehicleId) {
    this.boundVehicleId = vehicleId;
    this.boundAt = new Date();
    this.lifecycleStatus = 'ACTIVE';
};

DeviceSchema.methods.unbind = function () {
    const previousVehicleId = this.boundVehicleId;
    this.boundVehicleId = undefined;
    this.boundAt = undefined;
    return previousVehicleId;
};

// Static methods
DeviceSchema.statics.findByDeviceId = function (deviceId) {
    return this.findOne({ deviceId, isDeleted: false });
};

DeviceSchema.statics.findBySerialNumber = function (serialNumber) {
    return this.findOne({ serialNumber, isDeleted: false });
};

DeviceSchema.statics.findUnboundActive = function () {
    return this.find({
        isDeleted: false,
        lifecycleStatus: 'ACTIVE',
        boundVehicleId: { $exists: false },
    });
};

DeviceSchema.statics.findOnlineDevices = function () {
    return this.find({ isOnline: true, isDeleted: false });
};

DeviceSchema.statics.findByApiKey = async function (apiKey) {
    // Get all active devices and compare keys
    const devices = await this.find({ isDeleted: false, lifecycleStatus: 'ACTIVE' }).select('+apiKey');
    for (const device of devices) {
        const isMatch = await bcrypt.compare(apiKey, device.apiKey);
        if (isMatch) {
            // Return device without apiKey
            device.apiKey = undefined;
            return device;
        }
    }
    return null;
};

const Device = mongoose.model('Device', DeviceSchema);

module.exports = Device;
