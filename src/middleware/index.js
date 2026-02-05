/**
 * Middleware Index
 * Export all middleware from a single point
 */

const { authenticate, optionalAuth, requireRoles, requireOwner, requireRTO, requireLocalAuth, requireStateAuth, requireAdmin, requireEmployee } = require('./auth');
const { authenticateDevice, requireBoundDevice, requireCamera } = require('./deviceAuth');
const { validateBody, validateQuery, validateParams, validate } = require('./validate');
const { AppError, notFoundHandler, errorHandler, asyncHandler } = require('./errorHandler');
const { defaultLimiter, authLimiter, deviceLimiter, createLimiter } = require('./rateLimiter');

module.exports = {
    // Auth
    authenticate,
    optionalAuth,
    requireRoles,
    requireOwner,
    requireRTO,
    requireLocalAuth,
    requireStateAuth,
    requireAdmin,
    requireEmployee,

    // Device Auth
    authenticateDevice,
    requireBoundDevice,
    requireCamera,

    // Validation
    validateBody,
    validateQuery,
    validateParams,
    validate,

    // Error handling
    AppError,
    notFoundHandler,
    errorHandler,
    asyncHandler,

    // Rate limiting
    defaultLimiter,
    authLimiter,
    deviceLimiter,
    createLimiter,
};
