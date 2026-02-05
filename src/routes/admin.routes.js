/**
 * Admin Routes
 * System administration endpoints
 */
const express = require('express');
const router = express.Router();
const { adminController } = require('../controllers');
const { authenticate, requireAdmin } = require('../middleware');

// All routes require admin authentication
router.use(authenticate, requireAdmin);

// Devices
router.post('/devices', adminController.createDevice);
router.get('/devices', adminController.listDevices);
router.post('/devices/:deviceId/activate', adminController.activateDevice);

// RTOs
router.post('/rtos', adminController.createRTO);

// State Authorities
router.post('/state-authorities', adminController.createStateAuthority);

// System
router.get('/stats', adminController.getSystemStats);
router.get('/audit', adminController.getAuditLogs);

module.exports = router;
