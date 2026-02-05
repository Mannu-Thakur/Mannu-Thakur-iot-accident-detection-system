/**
 * RescueTask Model
 * Rescue task with multiple employee assignments
 */
const mongoose = require('mongoose');
const { generateTaskId } = require('../utils/idGenerator');

// Employee assignment subdocument
const EmployeeAssignmentSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true,
    },
    employeeName: String,
    role: String,
    assignedAt: {
        type: Date,
        default: Date.now,
    },
    acknowledgedAt: Date,
    arrivedAt: Date,
    completedAt: Date,
    status: {
        type: String,
        enum: ['ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'UNAVAILABLE'],
        default: 'ASSIGNED',
    },
    notes: String,
}, { _id: false });

// Rescue task schema
const RescueTaskSchema = new mongoose.Schema({
    taskId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: generateTaskId,
    },

    // Incident reference
    incidentId: {
        type: String,
        required: true,
        index: true,
    },

    // Assigning authority
    assignedAuthorityId: {
        type: String,
        required: true,
        index: true,
    },
    assignedBy: {
        type: String, // Officer/user ID who assigned
    },

    // Employee IDs (simple array for quick reference)
    employeeIds: [{
        type: String,
    }],

    // Detailed employee assignments
    employeeAssignments: [{
        type: EmployeeAssignmentSchema,
    }],

    // Task status
    status: {
        type: String,
        enum: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        default: 'PENDING',
        index: true,
    },

    // Priority level (1-5, 5 being highest)
    priority: {
        type: Number,
        min: 1,
        max: 5,
        default: 3,
    },

    // Timing
    assignedAt: {
        type: Date,
        default: Date.now,
    },
    acknowledgedAt: {
        type: Date,
    },
    arrivedAt: {
        type: Date,
    },
    completedAt: {
        type: Date,
    },
    cancelledAt: {
        type: Date,
    },

    // Estimated time of arrival
    estimatedArrivalMinutes: {
        type: Number,
    },
    actualArrivalMinutes: {
        type: Number,
    },

    // Resolution
    resolutionReport: {
        type: String,
        maxlength: 2000,
    },

    // Resources deployed
    resourcesDeployed: [{
        type: {
            type: String,
            enum: ['AMBULANCE', 'FIRE_TRUCK', 'POLICE_VEHICLE', 'TOW_TRUCK', 'HELICOPTER', 'OTHER'],
        },
        count: Number,
        details: String,
    }],

    // Notes
    notes: {
        type: String,
        maxlength: 1000,
    },

    // Cancel reason
    cancelReason: {
        type: String,
    },
    cancelledBy: {
        type: String,
    },

    // Location (copied from incident for quick access)
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

    // Metadata
    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: Date,
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Indexes
RescueTaskSchema.index({ location: '2dsphere' });
RescueTaskSchema.index({ status: 1, priority: -1 });
RescueTaskSchema.index({ assignedAuthorityId: 1, status: 1 });
RescueTaskSchema.index({ 'employeeAssignments.employeeId': 1 });

// Virtual for incident
RescueTaskSchema.virtual('incident', {
    ref: 'Incident',
    localField: 'incidentId',
    foreignField: 'incidentId',
    justOne: true,
});

// Instance methods
RescueTaskSchema.methods.addEmployee = function (employee) {
    this.employeeIds.push(employee.employeeId);
    this.employeeAssignments.push({
        employeeId: employee.employeeId,
        employeeName: employee.name,
        role: employee.role,
        assignedAt: new Date(),
        status: 'ASSIGNED',
    });

    if (this.status === 'PENDING') {
        this.status = 'ASSIGNED';
    }
};

RescueTaskSchema.methods.employeeAcknowledge = function (employeeId) {
    const assignment = this.employeeAssignments.find(a => a.employeeId === employeeId);
    if (assignment) {
        assignment.acknowledgedAt = new Date();
        assignment.status = 'ACKNOWLEDGED';
    }

    // Check if any employee has acknowledged
    if (!this.acknowledgedAt) {
        this.acknowledgedAt = new Date();
    }
};

RescueTaskSchema.methods.employeeEnRoute = function (employeeId) {
    const assignment = this.employeeAssignments.find(a => a.employeeId === employeeId);
    if (assignment) {
        assignment.status = 'EN_ROUTE';
    }
    this.status = 'IN_PROGRESS';
};

RescueTaskSchema.methods.employeeArrived = function (employeeId) {
    const assignment = this.employeeAssignments.find(a => a.employeeId === employeeId);
    if (assignment) {
        assignment.arrivedAt = new Date();
        assignment.status = 'ARRIVED';
    }

    // Set task arrival on first employee arrival
    if (!this.arrivedAt) {
        this.arrivedAt = new Date();
        if (this.assignedAt) {
            this.actualArrivalMinutes = Math.floor(
                (this.arrivedAt - this.assignedAt) / 60000
            );
        }
    }
};

RescueTaskSchema.methods.employeeComplete = function (employeeId, notes = '') {
    const assignment = this.employeeAssignments.find(a => a.employeeId === employeeId);
    if (assignment) {
        assignment.completedAt = new Date();
        assignment.status = 'COMPLETED';
        assignment.notes = notes;
    }
};

RescueTaskSchema.methods.complete = function (report, resolvedBy) {
    this.status = 'COMPLETED';
    this.completedAt = new Date();
    this.resolutionReport = report;

    // Mark all assignments as completed
    this.employeeAssignments.forEach(a => {
        if (a.status !== 'COMPLETED') {
            a.completedAt = new Date();
            a.status = 'COMPLETED';
        }
    });
};

RescueTaskSchema.methods.cancel = function (reason, cancelledBy) {
    this.status = 'CANCELLED';
    this.cancelledAt = new Date();
    this.cancelReason = reason;
    this.cancelledBy = cancelledBy;
};

RescueTaskSchema.methods.getActiveEmployees = function () {
    return this.employeeAssignments.filter(a =>
        ['ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED'].includes(a.status)
    );
};

// Static methods
RescueTaskSchema.statics.findByTaskId = function (taskId) {
    return this.findOne({ taskId, isDeleted: false });
};

RescueTaskSchema.statics.findByIncidentId = function (incidentId) {
    return this.findOne({ incidentId, isDeleted: false });
};

RescueTaskSchema.statics.findByAuthority = function (authorityId, filters = {}) {
    return this.find({
        assignedAuthorityId: authorityId,
        isDeleted: false,
        ...filters,
    }).sort({ createdAt: -1 });
};

RescueTaskSchema.statics.findByEmployee = function (employeeId) {
    return this.find({
        employeeIds: employeeId,
        isDeleted: false,
        status: { $nin: ['COMPLETED', 'CANCELLED'] },
    }).sort({ priority: -1, createdAt: -1 });
};

RescueTaskSchema.statics.findActive = function () {
    return this.find({
        isDeleted: false,
        status: { $in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
    }).sort({ priority: -1, createdAt: -1 });
};

const RescueTask = mongoose.model('RescueTask', RescueTaskSchema);

module.exports = RescueTask;
