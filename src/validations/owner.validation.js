/**
 * Owner Validation Schemas
 */
const Joi = require('joi');

// Update nominees schema
const updateNomineesSchema = Joi.object({
    nominees: Joi.array().items(Joi.object({
        nomineeId: Joi.string().optional(),
        name: Joi.string().required().max(100),
        phone: Joi.string().required().pattern(/^[+]?[\d\s-]{10,15}$/),
        address: Joi.string().max(500).optional().allow(''),
        relation: Joi.string().valid('SPOUSE', 'PARENT', 'SIBLING', 'CHILD', 'FRIEND', 'OTHER').optional(),
        isPrimary: Joi.boolean().optional().default(false),
    })).max(5).required(),
});

// Incidents query schema
const ownerIncidentsQuerySchema = Joi.object({
    page: Joi.number().min(1).optional().default(1),
    limit: Joi.number().min(1).max(50).optional().default(10),
    status: Joi.string().valid('REPORTED', 'AI_PROCESSING', 'VERIFIED', 'FALSE_POSITIVE', 'DISPATCHED', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED').optional(),
    vehicleId: Joi.string().optional(),
});

module.exports = {
    updateNomineesSchema,
    ownerIncidentsQuerySchema,
};
