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

// Incident payload schema
const incidentPayloadSchema = Joi.object({
    messageId: Joi.string().required().messages({
        'any.required': 'Message ID is required for deduplication',
    }),
    senderTimestamp: Joi.date().iso().required().messages({
        'any.required': 'Sender timestamp is required',
    }),
    location: locationSchema.required().messages({
        'any.required': 'Location is required',
    }),
    speed: Joi.number().min(0).max(500).optional(),
    airbagsDeployed: Joi.boolean().optional().default(false),
    brakeFailure: Joi.boolean().optional().default(false),
    impactDirection: Joi.string().valid('FRONT', 'REAR', 'LEFT', 'RIGHT', 'ROLLOVER', 'UNKNOWN').optional().default('UNKNOWN'),
    impactForce: Joi.number().min(0).optional(),
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
