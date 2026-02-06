/**
 * LocalAuthority Model
 * District-level authority with jurisdiction geo-fence and location
 */
const mongoose = require('mongoose');
const { generateAuthorityId } = require('../utils/idGenerator');

const LocalAuthoritySchema = new mongoose.Schema({
    authorityId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: generateAuthorityId,
    },

    // Basic info
    name: {
        type: String,
        required: [true, 'Authority name is required'],
        trim: true,
        maxlength: 200,
    },
    code: {
        type: String, // Short code like "LA-MH-PUN-01"
        unique: true,
        sparse: true,
        trim: true,
    },

    // Location (headquarters)
    district: {
        type: String,
        required: [true, 'District is required'],
        trim: true,
        index: true,
    },
    state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
        index: true,
    },

    // Headquarters location (Point) - for distance calculations
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

    // Jurisdiction area (Polygon)
    regionGeoFence: {
        type: {
            type: String,
            enum: ['Polygon'],
        },
        coordinates: {
            type: [[[Number]]], // Array of arrays of coordinate pairs
        },
    },

    // Contact info
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

    // Emergency numbers
    emergencyNumbers: [{
        type: {
            type: String,
            enum: ['AMBULANCE', 'FIRE', 'POLICE', 'GENERAL', 'OTHER'],
        },
        number: String,
        available24x7: { type: Boolean, default: true },
    }],

    // Operating hours
    operatingHours: {
        is24x7: { type: Boolean, default: true },
        openTime: String, // HH:MM
        closeTime: String, // HH:MM
        timezone: { type: String, default: 'Asia/Kolkata' },
    },

    // Capacity
    totalEmployees: {
        type: Number,
        default: 0,
    },
    availableEmployees: {
        type: Number,
        default: 0,
    },

    // Resources
    resources: {
        ambulances: { type: Number, default: 0 },
        firetrucks: { type: Number, default: 0 },
        policeVehicles: { type: Number, default: 0 },
        helicopters: { type: Number, default: 0 },
    },

    // Parent authority (for hierarchy)
    parentAuthorityId: {
        type: String,
        index: true,
    },

    // State authority reference
    stateAuthorityId: {
        type: String,
        index: true,
    },

    // Stats
    incidentsHandled: {
        type: Number,
        default: 0,
    },
    averageResponseMinutes: {
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

// Geospatial indexes
LocalAuthoritySchema.index({ location: '2dsphere' });
LocalAuthoritySchema.index({ regionGeoFence: '2dsphere' });
LocalAuthoritySchema.index({ state: 1, district: 1 });

// Virtual for employees
LocalAuthoritySchema.virtual('employees', {
    ref: 'Employee',
    localField: 'authorityId',
    foreignField: 'authorityId',
});

// Instance methods
LocalAuthoritySchema.methods.getEmergencyNumber = function (type = 'GENERAL') {
    const emergency = this.emergencyNumbers.find(e => e.type === type);
    return emergency ? emergency.number : this.contactPhone;
};

LocalAuthoritySchema.methods.incrementIncidentCount = function () {
    this.incidentsHandled += 1;
};

LocalAuthoritySchema.methods.updateAverageResponseTime = function (newResponseMinutes) {
    if (this.incidentsHandled === 0) {
        this.averageResponseMinutes = newResponseMinutes;
    } else {
        this.averageResponseMinutes = (
            (this.averageResponseMinutes * this.incidentsHandled + newResponseMinutes) /
            (this.incidentsHandled + 1)
        );
    }
};

LocalAuthoritySchema.methods.updateEmployeeCount = async function () {
    const Employee = mongoose.model('Employee');

    const total = await Employee.countDocuments({
        authorityId: this.authorityId,
        isActive: true,
        isDeleted: false,
    });

    const available = await Employee.countDocuments({
        authorityId: this.authorityId,
        status: 'AVAILABLE',
        isActive: true,
        isDeleted: false,
    });

    this.totalEmployees = total;
    this.availableEmployees = available;
};

// Static methods
LocalAuthoritySchema.statics.findByAuthorityId = function (authorityId) {
    return this.findOne({ authorityId, isDeleted: false });
};

LocalAuthoritySchema.statics.findByDistrict = function (state, district) {
    return this.find({
        state,
        district,
        isActive: true,
        isDeleted: false,
    });
};

LocalAuthoritySchema.statics.findByState = function (state) {
    return this.find({
        state,
        isActive: true,
        isDeleted: false,
    }).sort({ district: 1 });
};

/**
 * Find nearest authority to a location
 * @param {Number} longitude 
 * @param {Number} latitude 
 * @param {Number} maxDistanceMeters 
 * @param {Number} limit 
 */
LocalAuthoritySchema.statics.findNearestAuthority = function (longitude, latitude, maxDistanceMeters = 50000, limit = 1) {
    return this.find({
        isActive: true,
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
    }).limit(limit);
};

/**
 * Find authority by point within jurisdiction
 * @param {Number} longitude 
 * @param {Number} latitude 
 */
LocalAuthoritySchema.statics.findByJurisdiction = function (longitude, latitude) {
    return this.findOne({
        isActive: true,
        isDeleted: false,
        regionGeoFence: {
            $geoIntersects: {
                $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
            },
        },
    });
};

/**
 * Find nearest authorities, ordered by distance
 * Returns authorities with distance in meters
 */
LocalAuthoritySchema.statics.findNearestWithDistance = async function (longitude, latitude, maxDistanceMeters = 100000, limit = 5) {
    const result = await this.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
                distanceField: 'distance',
                maxDistance: maxDistanceMeters,
                spherical: true,
                query: {
                    isActive: true,
                    isDeleted: false,
                },
            },
        },
        { $limit: limit },
        {
            $project: {
                authorityId: 1,
                name: 1,
                district: 1,
                state: 1,
                location: 1,
                contactPhone: 1,
                contactEmail: 1,
                distance: 1,
                availableEmployees: 1,
            },
        },
    ]);

    return result;
};

const LocalAuthority = mongoose.model('LocalAuthority', LocalAuthoritySchema);

module.exports = LocalAuthority;
