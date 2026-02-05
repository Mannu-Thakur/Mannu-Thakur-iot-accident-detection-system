/**
 * Device Authentication Middleware
 * API Key based authentication for IoT devices
 */
const Device = require('../models/Device');
const logger = require('../utils/logger');
const { sendUnauthorized, sendForbidden } = require('../utils/response');

/**
 * Authenticate device via API key header
 * Header: X-Device-Key: <api_key>
 */
const authenticateDevice = async (req, res, next) => {
    try {
        // Get API key from header
        const apiKey = req.headers['x-device-key'];

        if (!apiKey) {
            return sendUnauthorized(res, 'Device API key required');
        }

        // Get deviceId from URL params
        const deviceId = req.params.deviceId;

        if (!deviceId) {
            return sendUnauthorized(res, 'Device ID required');
        }

        // Find device
        const device = await Device.findByDeviceId(deviceId);

        if (!device) {
            logger.warn('Device not found:', { deviceId });
            return sendUnauthorized(res, 'Device not found');
        }

        // Check lifecycle status
        if (device.lifecycleStatus !== 'ACTIVE') {
            logger.warn('Device not active:', { deviceId, status: device.lifecycleStatus });
            return sendForbidden(res, `Device is ${device.lifecycleStatus}`);
        }

        // Validate API key
        const isValid = await device.validateApiKey(apiKey);

        if (!isValid) {
            logger.warn('Invalid device API key:', { deviceId });
            return sendUnauthorized(res, 'Invalid API key');
        }

        // Attach device to request
        req.device = {
            deviceId: device.deviceId,
            boundVehicleId: device.boundVehicleId,
            camEnabled: device.camEnabled,
            speedometerAttachedDate: device.speedometerAttachedDate,
            brakeInputDate: device.brakeInputDate,
            airbagInputDate: device.airbagInputDate,
            isOnline: device.isOnline,
            lifecycleStatus: device.lifecycleStatus,
        };
        req.deviceDoc = device; // Full document if needed

        next();
    } catch (error) {
        logger.error('Device authentication error:', error);
        return sendUnauthorized(res, 'Device authentication failed');
    }
};

/**
 * Require device to be bound to a vehicle
 */
const requireBoundDevice = (req, res, next) => {
    if (!req.device) {
        return sendUnauthorized(res, 'Device authentication required');
    }

    if (!req.device.boundVehicleId) {
        return sendForbidden(res, 'Device not bound to any vehicle');
    }

    next();
};

/**
 * Require device to have camera
 */
const requireCamera = (req, res, next) => {
    if (!req.device) {
        return sendUnauthorized(res, 'Device authentication required');
    }

    if (!req.device.camEnabled) {
        return sendForbidden(res, 'Device does not have camera capability');
    }

    next();
};

module.exports = {
    authenticateDevice,
    requireBoundDevice,
    requireCamera,
};
