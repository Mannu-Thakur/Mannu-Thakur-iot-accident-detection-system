/**
 * Stream Service
 * Manages stream tokens for live preview
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Generate a stream token for live access
 * @param {String} requestId 
 * @param {String} authorityId 
 * @param {String} deviceId 
 * @param {Number} expiresInSeconds 
 * @returns {Object} { token, expiresAt }
 */
const generateStreamToken = (requestId, authorityId, deviceId, expiresInSeconds = null) => {
    const expiry = expiresInSeconds || config.liveAccess.streamTokenExpiresSeconds;

    const payload = {
        type: 'STREAM_TOKEN',
        requestId,
        authorityId,
        deviceId,
        iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(payload, config.jwt.secret, {
        expiresIn: expiry,
    });

    const expiresAt = new Date(Date.now() + expiry * 1000);

    logger.debug('Stream token generated:', { requestId, authorityId, expiresAt });

    return { token, expiresAt };
};

/**
 * Verify a stream token
 * @param {String} token 
 * @returns {Object|null} Decoded payload or null if invalid
 */
const verifyStreamToken = (token) => {
    try {
        const decoded = jwt.verify(token, config.jwt.secret);

        if (decoded.type !== 'STREAM_TOKEN') {
            logger.warn('Invalid token type:', decoded.type);
            return null;
        }

        return decoded;
    } catch (error) {
        logger.warn('Stream token verification failed:', error.message);
        return null;
    }
};

/**
 * Check if token is expired
 * @param {String} token 
 * @returns {Boolean}
 */
const isTokenExpired = (token) => {
    try {
        jwt.verify(token, config.jwt.secret);
        return false;
    } catch (error) {
        return error.name === 'TokenExpiredError';
    }
};

/**
 * Decode token without verification (for debugging)
 * @param {String} token 
 * @returns {Object|null}
 */
const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (error) {
        return null;
    }
};

module.exports = {
    generateStreamToken,
    verifyStreamToken,
    isTokenExpired,
    decodeToken,
};
