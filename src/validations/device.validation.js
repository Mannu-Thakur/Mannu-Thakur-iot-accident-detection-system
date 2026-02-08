/**
 * Device Validation Schemas
 */
const Joi = require('joi');

// Location schema
const locationSchema = Joi.object({
    lat: Joi.number().min(-90).max(90).required().messages({
        'any.required': 'Latitude is required',
        'number.min': 'Invalid latitude',
        'number.max': 'Invalid latitude',
    }),
    lon: Joi.number().min(-180).max(180).required().messages({
        'any.required': 'Longitude is required',
        'number.min': 'Invalid longitude',
        'number.max': 'Invalid longitude',
    }),
});

// Heartbeat schema
const heartbeatSchema = Joi.object({
    senderTimestamp: Joi.date().iso().required().messages({
        'any.required': 'Sender timestamp is required',
    }),
    batteryLevel: Joi.number().min(0).max(100).optional(),
    gps: locationSchema.optional(),
    firmwareVersion: Joi.string().max(20).optional(),
    messageId: Joi.string().optional(),
});

// Incident payload schema - all fields optional, device sends what it has
const incidentPayloadSchema = Joi.object({
    messageId: Joi.string().optional(), // Auto-generated if not provided
    senderTimestamp: Joi.date().iso().optional(), // Defaults to server time
    location: locationSchema.optional(), // May not have GPS lock
    speed: Joi.number().min(0).max(500).optional(),
    impactForce: Joi.number().min(0).optional(),
    impactDirection: Joi.string().valid('FRONT', 'REAR', 'LEFT', 'RIGHT', 'ROLLOVER', 'UNKNOWN').optional(),
    airbagsDeployed: Joi.boolean().optional(), // Optional sensor data
    isBreakFail: Joi.boolean().optional(), // Brake failure detected
    isFreeFall: Joi.boolean().optional(), // Free fall / rollover detected
    connectivityUsed: Joi.string().valid('INTERNET', 'LORA').optional().default('INTERNET'),
});

// Live access cancel schema
const liveAccessCancelSchema = Joi.object({
    requestId: Joi.string().required().messages({
        'any.required': 'Request ID is required',
    }),
    senderTimestamp: Joi.date().iso().required().messages({
        'any.required': 'Sender timestamp is required',
    }),
    messageId: Joi.string().optional(),
    reason: Joi.string().max(500).optional(),
});

// Live access ack schema
const liveAccessAckSchema = Joi.object({
    requestId: Joi.string().required().messages({
        'any.required': 'Request ID is required',
    }),
    senderTimestamp: Joi.date().iso().required().messages({
        'any.required': 'Sender timestamp is required',
    }),
});

module.exports = {
    locationSchema,
    heartbeatSchema,
    incidentPayloadSchema,
    liveAccessCancelSchema,
    liveAccessAckSchema,
};
