/**
 * Notification Service
 * Handles SMS, Email, and Push notifications
 * Works without actual credentials in development mode
 */
const config = require('../config');
const logger = require('../utils/logger');

/**
 * SMS notification using Twilio (or mock in development)
 */
const sendSMS = async (phoneNumber, message) => {
    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (!normalizedPhone) {
        logger.warn('Invalid phone number for SMS:', phoneNumber);
        return { success: false, error: 'Invalid phone number' };
    }

    // Log the SMS attempt
    logger.info('SMS Notification:', {
        to: normalizedPhone,
        message: message.substring(0, 50) + '...',
        enabled: config.sms.enabled,
    });

    // If SMS is not enabled (development mode), mock the send
    if (!config.sms.enabled) {
        logger.info('[MOCK SMS] Would send to:', normalizedPhone);
        logger.info('[MOCK SMS] Message:', message);

        return {
            success: true,
            mock: true,
            to: normalizedPhone,
            message,
            timestamp: new Date().toISOString(),
        };
    }

    // Production: Use Twilio
    try {
        // Dynamic import to avoid errors when Twilio is not installed
        const twilio = require('twilio');
        const client = twilio(config.sms.twilioAccountSid, config.sms.twilioAuthToken);

        const result = await client.messages.create({
            body: message,
            from: config.sms.twilioPhoneNumber,
            to: normalizedPhone,
        });

        logger.info('SMS sent successfully:', { sid: result.sid, to: normalizedPhone });

        return {
            success: true,
            sid: result.sid,
            to: normalizedPhone,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        logger.error('SMS send failed:', error);
        return {
            success: false,
            error: error.message,
            to: normalizedPhone,
        };
    }
};

/**
 * Send SMS to multiple recipients
 */
const sendBulkSMS = async (phoneNumbers, message) => {
    const results = await Promise.allSettled(
        phoneNumbers.map(phone => sendSMS(phone, message))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || !r.value?.success);

    return {
        total: phoneNumbers.length,
        successful: successful.length,
        failed: failed.length,
        results: results.map((r, i) => ({
            phone: phoneNumbers[i],
            success: r.status === 'fulfilled' && r.value.success,
            details: r.status === 'fulfilled' ? r.value : { error: r.reason?.message },
        })),
    };
};

/**
 * Notify nominees about an incident
 */
const notifyNominees = async (nominees, incidentData) => {
    if (!nominees || nominees.length === 0) {
        logger.warn('No nominees to notify');
        return { success: false, error: 'No nominees provided' };
    }

    const message = buildIncidentSMSMessage(incidentData);
    const phoneNumbers = nominees.map(n => n.phone).filter(Boolean);

    if (phoneNumbers.length === 0) {
        logger.warn('No valid phone numbers in nominees');
        return { success: false, error: 'No valid phone numbers' };
    }

    logger.info('Notifying nominees:', { count: phoneNumbers.length, incidentId: incidentData.incidentId });

    const results = await sendBulkSMS(phoneNumbers, message);

    return {
        success: results.successful > 0,
        ...results,
        incidentId: incidentData.incidentId,
        notifiedAt: new Date().toISOString(),
    };
};

/**
 * Build incident notification message
 */
const buildIncidentSMSMessage = (incidentData) => {
    const parts = [
        `ALERT: Accident detected for vehicle ${incidentData.registrationNo || incidentData.vehicleId}.`,
    ];

    if (incidentData.location) {
        const lat = incidentData.location.coordinates?.[1] || incidentData.location.lat;
        const lon = incidentData.location.coordinates?.[0] || incidentData.location.lon;
        if (lat && lon) {
            parts.push(`Location: https://maps.google.com/?q=${lat},${lon}`);
        }
    }

    if (incidentData.severityLevel) {
        parts.push(`Severity: ${incidentData.severityLevel}/5`);
    }

    parts.push(`Time: ${new Date(incidentData.timestamp?.serverTimestamp || Date.now()).toLocaleString('en-IN')}`);
    parts.push('Rescue team has been notified.');
    parts.push('Ref: ' + (incidentData.incidentId || 'N/A'));

    return parts.join('\n');
};

/**
 * Notify authority about new incident
 */
const notifyAuthorityViaSMS = async (authorityPhone, incidentData) => {
    const message = [
        `NEW INCIDENT: ${incidentData.incidentId}`,
        `Vehicle: ${incidentData.registrationNo || incidentData.vehicleId}`,
        `Severity: ${incidentData.severityLevel || 'Pending'}/5`,
        `Location: https://maps.google.com/?q=${incidentData.location?.coordinates?.[1]},${incidentData.location?.coordinates?.[0]}`,
        'Action required immediately.',
    ].join('\n');

    return sendSMS(authorityPhone, message);
};

/**
 * Send live access request notification to owner
 */
const notifyOwnerLiveAccessRequest = async (ownerPhone, requestData) => {
    const message = [
        `LIVE ACCESS REQUEST for your vehicle ${requestData.registrationNo || requestData.vehicleId}`,
        `Requested by: ${requestData.authorityName || 'Local Authority'}`,
        `Reason: ${requestData.reason || 'Incident verification'}`,
        `Expires in: ${Math.ceil((new Date(requestData.expiresAt) - new Date()) / 1000 / 60)} minutes`,
        'Press CANCEL button on your device to reject.',
    ].join('\n');

    return sendSMS(ownerPhone, message);
};

/**
 * Normalize phone number to E.164 format
 */
const normalizePhoneNumber = (phone) => {
    if (!phone) return null;

    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');

    // If it starts with 0, assume Indian number and add +91
    if (normalized.startsWith('0')) {
        normalized = '+91' + normalized.substring(1);
    }

    // If it's 10 digits, assume Indian number
    if (normalized.length === 10 && !normalized.startsWith('+')) {
        normalized = '+91' + normalized;
    }

    // If it doesn't start with +, add it
    if (!normalized.startsWith('+')) {
        normalized = '+' + normalized;
    }

    // Validate: should be + followed by 10-15 digits
    if (!/^\+\d{10,15}$/.test(normalized)) {
        return null;
    }

    return normalized;
};

/**
 * Email notification (placeholder for future implementation)
 */
const sendEmail = async (to, subject, body, html = null) => {
    logger.info('Email Notification:', { to, subject, enabled: config.email.enabled });

    if (!config.email.enabled) {
        logger.info('[MOCK EMAIL] Would send to:', to);
        logger.info('[MOCK EMAIL] Subject:', subject);
        return {
            success: true,
            mock: true,
            to,
            subject,
            timestamp: new Date().toISOString(),
        };
    }

    // TODO: Implement actual email sending with nodemailer or similar
    // For now, just log
    logger.warn('Email sending not implemented yet');
    return {
        success: false,
        error: 'Email sending not implemented',
    };
};

/**
 * Push notification (placeholder for future implementation)
 */
const sendPushNotification = async (userId, title, body, data = {}) => {
    logger.info('Push Notification:', { userId, title });

    // TODO: Implement with Firebase Cloud Messaging or similar
    logger.info('[MOCK PUSH] Would send to user:', userId);
    logger.info('[MOCK PUSH] Title:', title);

    return {
        success: true,
        mock: true,
        userId,
        title,
        timestamp: new Date().toISOString(),
    };
};

module.exports = {
    sendSMS,
    sendBulkSMS,
    notifyNominees,
    buildIncidentSMSMessage,
    notifyAuthorityViaSMS,
    notifyOwnerLiveAccessRequest,
    normalizePhoneNumber,
    sendEmail,
    sendPushNotification,
};
