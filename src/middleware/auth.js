/**
 * Authentication Middleware
 * JWT-based authentication for web clients
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const logger = require('../utils/logger');
const { sendUnauthorized, sendForbidden } = require('../utils/response');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return sendUnauthorized(res, 'No token provided');
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, config.jwt.secret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return sendUnauthorized(res, 'Token expired');
            }
            return sendUnauthorized(res, 'Invalid token');
        }

        // Attach user info to request
        const user = await User.findById(decoded.userId).select('+roles +referenceId +ownerId +rtoId +authorityId +employeeId +stateId');

        if (!user) {
            return sendUnauthorized(res, 'User not found');
        }

        if (!user.isActive) {
            return sendUnauthorized(res, 'Account is disabled');
        }

        req.user = user;
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        return sendUnauthorized(res, 'Authentication failed');
    }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.user = null;
            return next();
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            req.user = {
                userId: decoded.userId,
                email: decoded.email,
                roles: decoded.roles || [],
                ownerId: decoded.ownerId,
                rtoId: decoded.rtoId,
                authorityId: decoded.authorityId,
                employeeId: decoded.employeeId,
                stateId: decoded.stateId,
            };
        } catch (error) {
            req.user = null;
        }

        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

/**
 * Require specific roles
 * @param  {...String} roles 
 */
const requireRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return sendUnauthorized(res, 'Authentication required');
        }

        // Check if user has any of the required roles OR is an admin
        const hasRole = roles.some(role => req.user.roles.includes(role));
        const isAdmin = req.user.roles.includes('ROLE_ADMIN');

        if (!hasRole && !isAdmin) {
            return sendForbidden(res, 'Insufficient permissions');
        }

        next();
    };
};

/**
 * Require owner role and match ownerId
 */
const requireOwner = (req, res, next) => {
    if (!req.user) {
        return sendUnauthorized(res, 'Authentication required');
    }

    if (!req.user.roles.includes('ROLE_OWNER') && !req.user.roles.includes('ROLE_ADMIN')) {
        return sendForbidden(res, 'Owner access required');
    }

    // Admins skip ID check
    if (req.user.roles.includes('ROLE_ADMIN')) {
        return next();
    }

    if (!req.user.ownerId) {
        return sendForbidden(res, 'Owner profile not linked');
    }

    next();
};

/**
 * Require RTO role
 */
const requireRTO = (req, res, next) => {
    if (!req.user) {
        return sendUnauthorized(res, 'Authentication required');
    }

    if (!req.user.roles.includes('ROLE_RTO') && !req.user.roles.includes('ROLE_ADMIN')) {
        return sendForbidden(res, 'RTO access required');
    }

    next();
};

/**
 * Require Local Authority role and optionally match authorityId
 */
const requireLocalAuth = (req, res, next) => {
    if (!req.user) {
        return sendUnauthorized(res, 'Authentication required');
    }

    if (!req.user.roles.includes('ROLE_LOCAL_AUTH') && !req.user.roles.includes('ROLE_ADMIN')) {
        return sendForbidden(res, 'Local Authority access required');
    }

    // Optionally check if authorityId in params matches user's authorityId
    const paramAuthorityId = req.params.authorityId;

    // Admins bypass ID check
    if (req.user.roles.includes('ROLE_ADMIN')) {
        return next();
    }

    if (paramAuthorityId && req.user.authorityId && paramAuthorityId !== req.user.authorityId) {
        return sendForbidden(res, 'Access denied to this authority');
    }

    next();
};

/**
 * Require State Authority role
 */
const requireStateAuth = (req, res, next) => {
    if (!req.user) {
        return sendUnauthorized(res, 'Authentication required');
    }

    if (!req.user.roles.includes('ROLE_STATE_AUTH') && !req.user.roles.includes('ROLE_ADMIN')) {
        return sendForbidden(res, 'State Authority access required');
    }

    next();
};

/**
 * Require Admin role
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return sendUnauthorized(res, 'Authentication required');
    }

    if (!req.user.roles.includes('ROLE_ADMIN')) {
        return sendForbidden(res, 'Admin access required');
    }

    next();
};

/**
 * Require Employee role
 */
const requireEmployee = (req, res, next) => {
    if (!req.user) {
        return sendUnauthorized(res, 'Authentication required');
    }

    if (!req.user.roles.includes('ROLE_EMPLOYEE') && !req.user.roles.includes('ROLE_ADMIN')) {
        return sendForbidden(res, 'Employee access required');
    }

    // Admins can bypass profile check
    if (req.user.roles.includes('ROLE_ADMIN')) {
        return next();
    }

    if (!req.user.employeeId) {
        return sendForbidden(res, 'Employee profile not linked');
    }

    next();
};

module.exports = {
    authenticate,
    optionalAuth,
    requireRoles,
    requireOwner,
    requireRTO,
    requireLocalAuth,
    requireStateAuth,
    requireAdmin,
    requireEmployee,
};
