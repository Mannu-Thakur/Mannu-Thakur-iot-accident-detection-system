/**
 * Error Handling Middleware
 * Global error handler for Express
 */
const logger = require('../utils/logger');
const { sendError } = require('../utils/response');
const config = require('../config');

/**
 * Custom application error class
 */
class AppError extends Error {
    constructor(message, statusCode = 500, errors = null) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404);
    next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
    // Default values
    err.statusCode = err.statusCode || 500;
    err.message = err.message || 'Internal Server Error';

    // Log error
    if (err.statusCode >= 500) {
        logger.error('Server Error:', {
            message: err.message,
            stack: err.stack,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
        });
    } else {
        logger.warn('Client Error:', {
            message: err.message,
            statusCode: err.statusCode,
            url: req.originalUrl,
            method: req.method,
        });
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.keys(err.errors).map(key => ({
            field: key,
            message: err.errors[key].message,
        }));
        return sendError(res, 'Validation Error', 422, errors);
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return sendError(res, `${field} already exists`, 409);
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        return sendError(res, `Invalid ${err.path}: ${err.value}`, 400);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return sendError(res, 'Invalid token', 401);
    }

    if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Token expired', 401);
    }

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 'File too large', 413);
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return sendError(res, 'Unexpected file field', 400);
    }

    // Development: send full error
    if (config.env === 'development') {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors || null,
            stack: err.stack,
            timestamp: new Date().toISOString(),
        });
    }

    // Production: hide internal errors
    if (err.isOperational) {
        return sendError(res, err.message, err.statusCode, err.errors);
    }

    // Unknown error - don't leak info
    return sendError(res, 'Something went wrong', 500);
};

/**
 * Async handler wrapper to catch errors
 * @param {Function} fn 
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    AppError,
    notFoundHandler,
    errorHandler,
    asyncHandler,
};
