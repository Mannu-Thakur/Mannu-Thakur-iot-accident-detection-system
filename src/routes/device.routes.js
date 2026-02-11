/**
 * Device Routes
 * Device API endpoints: heartbeat, incident reporting, live access
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { deviceController } = require('../controllers');
const { authenticateDevice, requireBoundDevice, validateBody, deviceLimiter } = require('../middleware');
const { heartbeatSchema, incidentPayloadSchema, liveAccessCancelSchema, liveAccessAckSchema } = require('../validations');

// Multer config for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'incident-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files allowed'));
        }
    },
});

// All device routes require device authentication
router.use('/:deviceId', deviceLimiter);

// Heartbeat
router.post('/:deviceId/heartbeat', authenticateDevice, validateBody(heartbeatSchema), deviceController.heartbeat);

// Custom middleware to handle optional image upload or JSON-only
const handleIncidentUpload = (req, res, next) => {
    const contentType = req.headers['content-type'];
    if (contentType && contentType.includes('application/json')) {
        // If JSON, skip multer
        return next();
    }
    // Else use multer
    upload.single('image')(req, res, (err) => {
        if (err) {
            // If error is "Unexpected field" (maybe no image field?), ignore if we allow data-only
            // But multer throws "MulterError: Unexpected field" if name doesn't match.
            // If just missing, it usually passes with req.file = undefined.
            return next(err);
        }
        next();
    });
};

// Incident report (multipart with image OR json data)
router.post('/:deviceId/incident', authenticateDevice, requireBoundDevice, handleIncidentUpload, deviceController.reportIncident);

// Live access control
router.post('/:deviceId/live-access/cancel', authenticateDevice, validateBody(liveAccessCancelSchema), deviceController.cancelLiveAccess);
router.post('/:deviceId/live-access/ack', authenticateDevice, validateBody(liveAccessAckSchema), deviceController.ackLiveAccess);

module.exports = router;
