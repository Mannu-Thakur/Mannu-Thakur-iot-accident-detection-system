/**
 * Deduplication Service
 * Handles message and incident deduplication
 */
const RecentMessage = require('../models/RecentMessage');
const logger = require('../utils/logger');

/**
 * Check if a message is a duplicate
 * @param {String} messageId - Device-provided message ID
 * @param {String} imageHash - Hash of the image
 * @param {String} deviceId - Device ID
 * @param {Number} windowMs - Time window for hash-based dedup (default 5 min)
 * @returns {Object} { isDuplicate, incidentId, reason }
 */
const checkDuplicate = async (messageId, imageHash, deviceId, windowMs = 300000) => {
    try {
        // Use model's static method
        const result = await RecentMessage.checkDuplicate(messageId, imageHash, deviceId, windowMs);

        if (result.isDuplicate) {
            logger.info('Duplicate detected:', {
                messageId,
                imageHash: imageHash?.substring(0, 8),
                deviceId,
                reason: result.reason,
                existingIncidentId: result.incidentId,
            });
        }

        return result;
    } catch (error) {
        logger.error('Error checking duplicate:', error);
        // On error, assume not duplicate to avoid losing incidents
        return { isDuplicate: false };
    }
};

/**
 * Record a message for future deduplication
 * @param {String} messageId 
 * @param {String} deviceId 
 * @param {String} incidentId 
 * @param {String} imageHash 
 */
const recordMessage = async (messageId, deviceId, incidentId, imageHash = null) => {
    try {
        await RecentMessage.recordMessage(messageId, deviceId, incidentId, imageHash);
        logger.debug('Message recorded for dedup:', { messageId, deviceId, incidentId });
    } catch (error) {
        // Duplicate key error is expected if same messageId
        if (error.code === 11000) {
            logger.debug('Message already recorded (expected dedup):', { messageId });
            return;
        }
        logger.error('Error recording message:', error);
    }
};

/**
 * Check if an incident with similar characteristics exists
 * @param {Object} incidentData 
 * @param {Number} timeWindowMs 
 * @param {Number} distanceMeters 
 */
const checkSimilarIncident = async (incidentData, timeWindowMs = 300000, distanceMeters = 100) => {
    const Incident = require('../models/Incident');

    try {
        const windowStart = new Date(Date.now() - timeWindowMs);

        const query = {
            deviceId: incidentData.deviceId,
            isDeleted: false,
            'timestamp.serverTimestamp': { $gte: windowStart },
        };

        // Add geo query if location is available
        if (incidentData.location?.coordinates) {
            query.location = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: incidentData.location.coordinates,
                    },
                    $maxDistance: distanceMeters,
                },
            };
        }

        const similar = await Incident.findOne(query).sort({ 'timestamp.serverTimestamp': -1 });

        if (similar) {
            logger.info('Similar incident found:', {
                existingIncidentId: similar.incidentId,
                newDeviceId: incidentData.deviceId,
            });
            return { hasSimilar: true, existingIncident: similar };
        }

        return { hasSimilar: false };
    } catch (error) {
        logger.error('Error checking similar incident:', error);
        return { hasSimilar: false };
    }
};

module.exports = {
    checkDuplicate,
    recordMessage,
    checkSimilarIncident,
};
