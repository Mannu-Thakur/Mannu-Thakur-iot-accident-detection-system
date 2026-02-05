/**
 * Authority Validation Schemas
 */
const Joi = require('joi');

// Live access request schema
const liveAccessRequestSchema = Joi.object({
    incidentId: Joi.string().required().messages({
        'any.required': 'Incident ID is required',
    }),
    reason: Joi.string().max(500).optional().default('Incident verification'),
    expiresInSeconds: Joi.number().min(30).max(300).optional(),
});

// Assign rescue task schema
const assignTaskSchema = Joi.object({
    incidentId: Joi.string().required().messages({
        'any.required': 'Incident ID is required',
    }),
    employeeIds: Joi.array().items(Joi.string()).min(1).required().messages({
        'array.min': 'At least one employee must be assigned',
        'any.required': 'Employee IDs are required',
    }),
    priority: Joi.number().min(1).max(5).optional().default(3),
    notes: Joi.string().max(1000).optional(),
    estimatedArrivalMinutes: Joi.number().min(1).optional(),
});

// Update task schema
const updateTaskSchema = Joi.object({
    status: Joi.string().valid('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED').optional(),
    arrivedAt: Joi.date().optional(),
    completedAt: Joi.date().optional(),
    resolutionReport: Joi.string().max(2000).optional(),
    notes: Joi.string().max(1000).optional(),
    cancelReason: Joi.string().max(500).optional(),
});

// Employee task update schema
const employeeTaskUpdateSchema = Joi.object({
    action: Joi.string().valid('ACKNOWLEDGE', 'EN_ROUTE', 'ARRIVED', 'COMPLETE').required(),
    notes: Joi.string().max(500).optional(),
    location: Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lon: Joi.number().min(-180).max(180).required(),
    }).optional(),
});

// Incidents query schema
const incidentsQuerySchema = Joi.object({
    page: Joi.number().min(1).optional().default(1),
    limit: Joi.number().min(1).max(100).optional().default(20),
    status: Joi.string().valid('REPORTED', 'AI_PROCESSING', 'VERIFIED', 'FALSE_POSITIVE', 'DISPATCHED', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED').optional(),
    severityLevel: Joi.number().min(1).max(5).optional(),
    minSeverity: Joi.number().min(1).max(5).optional(),
    fromDate: Joi.date().optional(),
    toDate: Joi.date().optional(),
});

// Tasks query schema
const tasksQuerySchema = Joi.object({
    page: Joi.number().min(1).optional().default(1),
    limit: Joi.number().min(1).max(100).optional().default(20),
    status: Joi.string().valid('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED').optional(),
});

// Employees query schema
const employeesQuerySchema = Joi.object({
    page: Joi.number().min(1).optional().default(1),
    limit: Joi.number().min(1).max(100).optional().default(50),
    status: Joi.string().valid('AVAILABLE', 'BUSY_ON_TASK', 'ON_LEAVE', 'ON_VACATION', 'OFF_DUTY', 'INACTIVE').optional(),
    role: Joi.string().valid('DRIVER', 'MEDIC', 'FIRE', 'POLICE', 'TECH', 'COORDINATOR', 'OTHER').optional(),
});

// Create employee schema
const createEmployeeSchema = Joi.object({
    name: Joi.string().required().max(150),
    email: Joi.string().email().optional(),
    contact: Joi.string().required().pattern(/^[+]?[\d\s-]{10,15}$/),
    role: Joi.string().valid('DRIVER', 'MEDIC', 'FIRE', 'POLICE', 'TECH', 'COORDINATOR', 'OTHER').required(),
    shiftStart: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    shiftEnd: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    workDays: Joi.array().items(Joi.string().valid('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN')).optional(),
});

// Create local authority schema
const createLocalAuthoritySchema = Joi.object({
    name: Joi.string().required().max(200),
    code: Joi.string().max(20).optional(),
    district: Joi.string().required().max(100),
    state: Joi.string().required().max(100),
    location: Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lon: Joi.number().min(-180).max(180).required(),
    }).required(),
    contactEmail: Joi.string().email().optional(),
    contactPhone: Joi.string().pattern(/^[+]?[\d\s-]{10,15}$/).optional(),
    address: Joi.string().max(500).optional(),
    emergencyNumbers: Joi.array().items(Joi.object({
        type: Joi.string().valid('AMBULANCE', 'FIRE', 'POLICE', 'GENERAL', 'OTHER').required(),
        number: Joi.string().required(),
        available24x7: Joi.boolean().optional().default(true),
    })).optional(),
});

module.exports = {
    liveAccessRequestSchema,
    assignTaskSchema,
    updateTaskSchema,
    employeeTaskUpdateSchema,
    incidentsQuerySchema,
    tasksQuerySchema,
    employeesQuerySchema,
    createEmployeeSchema,
    createLocalAuthoritySchema,
};
