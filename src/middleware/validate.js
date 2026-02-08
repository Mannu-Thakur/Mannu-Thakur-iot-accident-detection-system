/**
 * Validation Middleware
 * Joi-based request validation
 */
const Joi = require('joi');
const { sendValidationError } = require('../utils/response');

/**
 * Validate request body against Joi schema
 * @param {Joi.Schema} schema 
 */
const validateBody = (schema) => {
    console.log("schema", schema);
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
            }));
            return sendValidationError(res, errors);
        }

        req.body = value;
        next();
    };
};

/**
 * Validate query params against Joi schema
 * @param {Joi.Schema} schema 
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
            }));
            return sendValidationError(res, errors);
        }

        req.query = value;
        next();
    };
};

/**
 * Validate URL params against Joi schema
 * @param {Joi.Schema} schema 
 */
const validateParams = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
            }));
            return sendValidationError(res, errors);
        }

        req.params = value;
        next();
    };
};

/**
 * Validate multiple parts of request
 * @param {Object} schemas - { body, query, params }
 */
const validate = (schemas) => {
    return (req, res, next) => {
        const errors = [];

        if (schemas.params) {
            const { error, value } = schemas.params.validate(req.params, { abortEarly: false, stripUnknown: true });
            if (error) {
                errors.push(...error.details.map(d => ({ field: `params.${d.path.join('.')}`, message: d.message })));
            } else {
                req.params = value;
            }
        }

        if (schemas.query) {
            const { error, value } = schemas.query.validate(req.query, { abortEarly: false, stripUnknown: true });
            if (error) {
                errors.push(...error.details.map(d => ({ field: `query.${d.path.join('.')}`, message: d.message })));
            } else {
                req.query = value;
            }
        }

        if (schemas.body) {
            const { error, value } = schemas.body.validate(req.body, { abortEarly: false, stripUnknown: true });
            if (error) {
                errors.push(...error.details.map(d => ({ field: `body.${d.path.join('.')}`, message: d.message })));
            } else {
                req.body = value;
            }
        }

        if (errors.length > 0) {
            return sendValidationError(res, errors);
        }

        next();
    };
};

module.exports = {
    validateBody,
    validateQuery,
    validateParams,
    validate,
};
