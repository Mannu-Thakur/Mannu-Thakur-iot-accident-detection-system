/**
 * Employee Model
 * Rescue team employees with availability status
 */
const mongoose = require('mongoose');
const { generateEmployeeId } = require('../utils/idGenerator');

const EmployeeSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: generateEmployeeId,
    },

    // Personal info
    name: {
        type: String,
        required: [true, 'Employee name is required'],
        trim: true,
        maxlength: 150,
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
    },
    contact: {
        type: String,
        required: [true, 'Contact number is required'],
        trim: true,
    },

    // Role/specialization
    role: {
        type: String,
        required: [true, 'Role is required'],
        enum: ['DRIVER', 'MEDIC', 'FIRE', 'POLICE', 'TECH', 'COORDINATOR', 'RESCUER', 'ROLE_EMPLOYEE', 'OTHER'],
        index: true,
    },

    // Certifications/qualifications
    certifications: [{
        name: String,
        issuedBy: String,
        issuedDate: Date,
        expiryDate: Date,
    }],

    // Authority assignment
    authorityId: {
        type: String,
        required: [true, 'Authority ID is required'],
        index: true,
    },

    // Availability status
    status: {
        type: String,
        enum: ['AVAILABLE', 'BUSY_ON_TASK', 'ON_LEAVE', 'ON_VACATION', 'OFF_DUTY', 'INACTIVE'],
        default: 'AVAILABLE',
        index: true,
    },

    // Current task (if busy)
    currentTaskId: {
        type: String,
        index: true,
        sparse: true,
    },

    // Current location
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
    lastLocationUpdatedAt: {
        type: Date,
    },

    // User ID for authentication
    userId: {
        type: String,
        index: true,
        sparse: true,
    },

    // Shift info
    shiftStart: {
        type: String, // HH:MM format
    },
    shiftEnd: {
        type: String, // HH:MM format
    },
    workDays: [{
        type: String,
        enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    }],

    // Stats
    tasksCompleted: {
        type: Number,
        default: 0,
    },
    averageResponseMinutes: {
        type: Number,
        default: 0,
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
    },

    // Socket connection
    socketId: {
        type: String,
    },
    isOnline: {
        type: Boolean,
        default: false,
    },
    lastSeenAt: {
        type: Date,
    },

    // Metadata
    joiningDate: {
        type: Date,
        default: Date.now,
    },
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

// Geospatial index
EmployeeSchema.index({ lastLocation: '2dsphere' });
EmployeeSchema.index({ authorityId: 1, status: 1 });
EmployeeSchema.index({ authorityId: 1, role: 1, status: 1 });

// Virtual for authority
EmployeeSchema.virtual('authority', {
    ref: 'LocalAuthority',
    localField: 'authorityId',
    foreignField: 'authorityId',
    justOne: true,
});

// Virtual for current task
EmployeeSchema.virtual('currentTask', {
    ref: 'RescueTask',
    localField: 'currentTaskId',
    foreignField: 'taskId',
    justOne: true,
});

// Instance methods
EmployeeSchema.methods.assignTask = function (taskId) {
    this.currentTaskId = taskId;
    this.status = 'BUSY_ON_TASK';
};

EmployeeSchema.methods.completeTask = function () {
    this.currentTaskId = undefined;
    this.status = 'AVAILABLE';
    this.tasksCompleted += 1;
};

EmployeeSchema.methods.updateLocation = function (lat, lon) {
    this.lastLocation = {
        type: 'Point',
        coordinates: [lon, lat],
    };
    this.lastLocationUpdatedAt = new Date();
};

EmployeeSchema.methods.setOnline = function (socketId) {
    this.socketId = socketId;
    this.isOnline = true;
    this.lastSeenAt = new Date();
};

EmployeeSchema.methods.setOffline = function () {
    this.socketId = undefined;
    this.isOnline = false;
};

EmployeeSchema.methods.isAvailable = function () {
    return this.status === 'AVAILABLE' && this.isActive && !this.isDeleted;
};

EmployeeSchema.methods.updateAverageResponseTime = function (newResponseMinutes) {
    if (this.tasksCompleted === 0) {
        this.averageResponseMinutes = newResponseMinutes;
    } else {
        // Running average
        this.averageResponseMinutes = (
            (this.averageResponseMinutes * this.tasksCompleted + newResponseMinutes) /
            (this.tasksCompleted + 1)
        );
    }
};

// Static methods
EmployeeSchema.statics.findByEmployeeId = function (employeeId) {
    return this.findOne({ employeeId, isDeleted: false });
};

EmployeeSchema.statics.findByAuthority = function (authorityId, filters = {}) {
    return this.find({
        authorityId,
        isDeleted: false,
        ...filters,
    }).sort({ name: 1 });
};

EmployeeSchema.statics.findAvailableByAuthority = function (authorityId, role = null) {
    const query = {
        authorityId,
        status: 'AVAILABLE',
        isActive: true,
        isDeleted: false,
    };
    if (role) {
        query.role = role;
    }
    return this.find(query).sort({ name: 1 });
};

EmployeeSchema.statics.findNearestAvailable = function (longitude, latitude, authorityId, maxDistanceMeters = 10000, limit = 5) {
    const query = {
        authorityId,
        status: 'AVAILABLE',
        isActive: true,
        isDeleted: false,
        lastLocation: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
                $maxDistance: maxDistanceMeters,
            },
        },
    };
    return this.find(query).limit(limit);
};

EmployeeSchema.statics.bulkSetBusy = async function (employeeIds, taskId) {
    // Atomic update with condition to prevent race conditions
    const result = await this.updateMany(
        {
            employeeId: { $in: employeeIds },
            status: 'AVAILABLE',
            isActive: true,
            isDeleted: false,
        },
        {
            $set: {
                status: 'BUSY_ON_TASK',
                currentTaskId: taskId,
            },
        }
    );
    return result;
};

EmployeeSchema.statics.bulkSetAvailable = async function (employeeIds) {
    const result = await this.updateMany(
        {
            employeeId: { $in: employeeIds },
            isDeleted: false,
        },
        {
            $set: {
                status: 'AVAILABLE',
            },
            $unset: {
                currentTaskId: 1,
            },
        }
    );
    return result;
};

const Employee = mongoose.model('Employee', EmployeeSchema);

module.exports = Employee;
