/**
 * Auth Controller
 * Handles user authentication and token generation
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, RTO, LocalAuthority, StateAuthority, Owner } = require('../models');
const config = require('../config');
const { sendSuccess, sendError, sendUnauthorized } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Generate JWT Token
 */
const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user._id,
            role: user.role,
            email: user.email,
            referenceId: user.referenceId
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
};

/**
 * Login User
 */
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return sendError(res, 'Email and password are required', 400);
    }

    // Find user (select password explicitly as it might be excluded)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return sendUnauthorized(res, 'Invalid email or password');
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return sendUnauthorized(res, 'Invalid email or password');
    }

    // Check if active
    if (!user.isActive) {
        return sendUnauthorized(res, 'Account is disabled');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    consttoken = generateToken(user);

    // Get profile details based on role
    let profile = null;
    if (user.role === 'RTO' && user.referenceId) {
        profile = await RTO.findOne({ rtoId: user.referenceId });
    } else if (user.role === 'LOCAL_AUTHORITY' && user.referenceId) {
        profile = await LocalAuthority.findOne({ authorityId: user.referenceId });
    } else if (user.role === 'STATE_AUTHORITY' && user.referenceId) {
        profile = await StateAuthority.findOne({ stateId: user.referenceId });
    } else if (user.role === 'OWNER' && user.referenceId) {
        profile = await Owner.findOne({ ownerId: user.referenceId });
    }

    // Remove sensitive data
    user.password = undefined;

    logger.info(`User logged in: ${email} (${user.role})`);

    return sendSuccess(res, {
        token,
        user: {
            id: user._id,
            email: user.email,
            role: user.role,
            name: user.name,
        },
        profile,
    });
});

/**
 * Get Current User
 */
const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId);
    if (!user) {
        return sendNotFound(res, 'User not found');
    }

    return sendSuccess(res, { user });
});

module.exports = {
    login,
    getMe,
};
