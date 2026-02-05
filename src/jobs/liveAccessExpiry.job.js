/**
 * Live Access Expiry Job
 * Handles auto-grant and expiry of live access requests
 */
const { LiveAccessRequest, Device } = require('../models');
const { streamService, auditService } = require('../services');
const { emitToAuthority, emitToDevice } = require('../socket');
const logger = require('../utils/logger');
const config = require('../config');

let expiryInterval = null;

/**
 * Start the expiry check interval
 */
const startExpiryChecker = () => {
    if (expiryInterval) {
        clearInterval(expiryInterval);
    }

    // Check every 5 seconds
    expiryInterval = setInterval(checkExpiredRequests, 5000);
    logger.info('Live access expiry checker started');
};

/**
 * Stop the expiry checker
 */
const stopExpiryChecker = () => {
    if (expiryInterval) {
        clearInterval(expiryInterval);
        expiryInterval = null;
    }
    logger.info('Live access expiry checker stopped');
};

/**
 * Check and process expired requests
 */
const checkExpiredRequests = async () => {
    try {
        const now = new Date();

        // Find pending requests that have expired
        const expiredRequests = await LiveAccessRequest.find({
            status: 'PENDING',
            expiresAt: { $lte: now },
            isDeleted: false,
        }).limit(50);

        for (const request of expiredRequests) {
            await processExpiredRequest(request);
        }

    } catch (error) {
        logger.error('Error checking expired requests:', error);
    }
};

/**
 * Process an expired request
 * Auto-grant if owner didn't cancel and device was online
 */
const processExpiredRequest = async (request) => {
    const { requestId, deviceId, authorityId, incidentId } = request;

    try {
        // Check device status
        const device = await Device.findByDeviceId(deviceId);
        const wasOnline = request.deviceWasOnline;
        const deviceAcked = request.deviceAckAt !== null;

        // Decision logic:
        // - If device was online and acked but owner didn't cancel -> AUTO-GRANT
        // - If device was offline -> EXPIRED (no auto-grant)
        // - If device never acked -> EXPIRED

        if (wasOnline && deviceAcked) {
            // Auto-grant access
            logger.info('Auto-granting live access:', { requestId, deviceId, authorityId });

            // Generate stream token
            const { token, expiresAt } = streamService.generateStreamToken(
                requestId,
                authorityId,
                deviceId
            );

            request.grant(token);
            request.streamTokenExpiresAt = expiresAt;
            await request.save();

            // Notify authority
            emitToAuthority(authorityId, 'access_granted', {
                requestId,
                incidentId,
                streamToken: token,
                expiresAt,
            });

            // Audit log
            await auditService.logLiveAccessGranted(requestId, {
                reason: 'AUTO_GRANT',
                deviceWasOnline: true,
                deviceAcked: true,
            });

        } else {
            // Mark as expired
            logger.info('Live access request expired:', {
                requestId,
                deviceWasOnline: wasOnline,
                deviceAcked
            });

            request.status = 'EXPIRED';
            await request.save();

            // Notify authority
            emitToAuthority(authorityId, 'access_expired', {
                requestId,
                incidentId,
                reason: wasOnline ? 'Device did not acknowledge' : 'Device was offline',
            });
        }

    } catch (error) {
        logger.error('Error processing expired request:', { requestId, error: error.message });

        // Mark as expired on error
        request.status = 'EXPIRED';
        await request.save();
    }
};

/**
 * Check and expire stream tokens
 */
const checkExpiredTokens = async () => {
    try {
        const now = new Date();

        // Find granted requests with expired tokens
        const expiredTokens = await LiveAccessRequest.find({
            status: 'GRANTED',
            streamTokenExpiresAt: { $lte: now },
            isDeleted: false,
        });

        for (const request of expiredTokens) {
            logger.info('Stream token expired:', { requestId: request.requestId });
            request.status = 'EXPIRED';
            await request.save();

            // Notify to terminate stream
            emitToAuthority(request.authorityId, 'stream_expired', {
                requestId: request.requestId,
            });
        }

    } catch (error) {
        logger.error('Error checking expired tokens:', error);
    }
};

module.exports = {
    startExpiryChecker,
    stopExpiryChecker,
    checkExpiredRequests,
    processExpiredRequest,
    checkExpiredTokens,
};
