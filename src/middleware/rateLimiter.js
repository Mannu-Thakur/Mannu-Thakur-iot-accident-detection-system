/**
 * Rate Limiting Middleware
 */
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { sendError } = require('../utils/response');

/**
 * Default rate limiter
 */
const defaultLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: { success: false, message: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        sendError(res, 'Too many requests, please try again later', 429);
    },
});

/**
 * Strict rate limiter for auth endpoints
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts
    message: { success: false, message: 'Too many login attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        sendError(res, 'Too many login attempts, please try again later', 429);
    },
});

/**
 * Device rate limiter (more lenient for IoT)
 */
const deviceLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: { success: false, message: 'Device rate limit exceeded' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use device ID as key instead of IP
        return req.params.deviceId || req.ip;
    },
    handler: (req, res) => {
        sendError(res, 'Device rate limit exceeded', 429);
    },
});

/**
 * Create custom rate limiter
 * @param {Object} options 
 */
const createLimiter = (options) => {
    return rateLimit({
        ...options,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            sendError(res, options.message || 'Rate limit exceeded', 429);
        },
    });
};

module.exports = {
    defaultLimiter,
    authLimiter,
    deviceLimiter,
    createLimiter,
};
