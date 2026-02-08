/**
 * RTO Validation Schemas
 */
const Joi = require('joi');

// Nominee schema
const nomineeSchema = Joi.object({
    nomineeId: Joi.string().optional(),
    name: Joi.string().required().max(100).messages({
        'string.empty': 'Nominee name is required',
        'any.required': 'Nominee name is required',
    }),
    phone: Joi.string().required().pattern(/^[+]?[\d\s-]{10,15}$/).messages({
        'string.pattern.base': 'Invalid phone number format',
        'any.required': 'Nominee phone is required',
    }),
    address: Joi.string().max(500).optional().allow(''),
    relation: Joi.string().valid('SPOUSE', 'PARENT', 'SIBLING', 'CHILD', 'FRIEND', 'OTHER').optional(),
    isPrimary: Joi.boolean().optional().default(false),
});

// Create owner schema
const createOwnerSchema = Joi.object({
    ownerId: Joi.string().optional(),
    fullName: Joi.string().required().max(150).messages({
        'string.empty': 'Full name is required',
        'any.required': 'Full name is required',
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Invalid email format',
        'any.required': 'Email is required',
    }),
    mobileNumber: Joi.string().required().pattern(/^[+]?[\d\s-]{10,15}$/).messages({
        'string.pattern.base': 'Invalid mobile number format',
        'any.required': 'Mobile number is required',
    }),
    address: Joi.string().max(500).optional().allow(''),
    nominees: Joi.array().items(nomineeSchema).max(5).optional().default([]),
    documents: Joi.array().items(Joi.object({
        type: Joi.string().valid('AADHAAR', 'PAN', 'DL', 'PASSPORT', 'OTHER').required(),
        number: Joi.string().required(),
        url: Joi.string().uri().optional(),
    })).optional(),
});

// Update owner schema - now includes all updatable fields
const updateOwnerSchema = Joi.object({
    fullName: Joi.string().max(150).optional(),
    email: Joi.string().email().optional(),
    mobileNumber: Joi.string().pattern(/^[+]?[\d\s-]{10,15}$/).optional(),
    address: Joi.string().max(500).optional().allow(''),
    isActive: Joi.boolean().optional(),
    nominees: Joi.array().items(nomineeSchema).max(5).optional(),
    documents: Joi.array().items(Joi.object({
        type: Joi.string().valid('AADHAAR', 'PAN', 'DL', 'PASSPORT', 'OTHER').required(),
        number: Joi.string().required(),
        url: Joi.string().uri().optional(),
    })).optional(),
});

// Register vehicle schema
const registerVehicleSchema = Joi.object({
    vehicleId: Joi.string().optional(),
    registrationNo: Joi.string().required().max(20).messages({
        'string.empty': 'Registration number is required',
        'any.required': 'Registration number is required',
    }),
    chassisNo: Joi.string().required().max(50).messages({
        'any.required': 'Chassis number is required',
    }),
    engineNo: Joi.string().max(50).optional().allow(''),
    vehicleType: Joi.string().valid('CAR', 'TRUCK', 'BIKE', 'BUS', 'AUTO', 'OTHER').required().messages({
        'any.required': 'Vehicle type is required',
    }),
    fuelType: Joi.string().valid('PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID', 'OTHER').optional(),
    model: Joi.string().max(100).optional(),
    manufacturer: Joi.string().max(100).optional(),
    manufacturingYear: Joi.number().min(1900).max(new Date().getFullYear() + 1).optional(),
    color: Joi.string().max(50).optional(),
    seatingCapacity: Joi.number().min(1).max(100).optional(),
    ownerId: Joi.string().required().messages({
        'any.required': 'Owner ID is required',
    }),
    deviceId: Joi.string().optional(),
    registrationDate: Joi.date().optional(),
    registrationExpiryDate: Joi.date().optional(),
    insuranceProvider: Joi.string().max(100).optional(),
    insurancePolicyNo: Joi.string().max(50).optional(),
    insuranceExpiryDate: Joi.date().optional(),
});

// Transfer ownership schema
const transferOwnershipSchema = Joi.object({
    newOwnerId: Joi.string().required().messages({
        'any.required': 'New owner ID is required',
    }),
    transferDate: Joi.date().optional().default(new Date()),
    documents: Joi.array().items(Joi.string().uri()).optional().default([]),
    reason: Joi.string().max(500).optional(),
});

// Replace device schema
const replaceDeviceSchema = Joi.object({
    vehicleId: Joi.string().required().messages({
        'any.required': 'Vehicle ID is required',
    }),
    oldDeviceId: Joi.string().required().messages({
        'any.required': 'Old device ID is required',
    }),
    newDeviceId: Joi.string().required().messages({
        'any.required': 'New device ID is required',
    }),
    reason: Joi.string().valid('FAULTY', 'UPGRADE', 'LOST', 'STOLEN', 'OTHER').required().messages({
        'any.required': 'Replacement reason is required',
    }),
    notes: Joi.string().max(500).optional(),
});

// Query schemas
const listOwnersQuerySchema = Joi.object({
    page: Joi.number().min(1).optional().default(1),
    limit: Joi.number().min(1).max(100).optional().default(20),
    search: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
});

const listVehiclesQuerySchema = Joi.object({
    page: Joi.number().min(1).optional().default(1),
    limit: Joi.number().min(1).max(100).optional().default(20),
    search: Joi.string().optional(),
    ownerId: Joi.string().optional(),
    vehicleType: Joi.string().valid('CAR', 'TRUCK', 'BIKE', 'BUS', 'AUTO', 'OTHER').optional(),
    hasDevice: Joi.boolean().optional(),
});

const auditQuerySchema = Joi.object({
    page: Joi.number().min(1).optional().default(1),
    limit: Joi.number().min(1).max(100).optional().default(50),
    action: Joi.string().optional(),
    targetType: Joi.string().optional(),
    targetId: Joi.string().optional(),
    actorId: Joi.string().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
});

module.exports = {
    nomineeSchema,
    createOwnerSchema,
    updateOwnerSchema,
    registerVehicleSchema,
    transferOwnershipSchema,
    replaceDeviceSchema,
    listOwnersQuerySchema,
    listVehiclesQuerySchema,
    auditQuerySchema,
};
