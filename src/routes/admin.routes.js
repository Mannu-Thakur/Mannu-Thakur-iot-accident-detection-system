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
router.post('/devices/:deviceId/api-key', adminController.regenerateApiKey);

// RTOs
router.post('/rtos', adminController.createRTO);

// State Authorities
router.post('/state-authorities', adminController.createStateAuthority);
router.get('/state-authorities', adminController.listStateAuthorities);
router.put('/state-authorities/:stateId', adminController.updateStateAuthority);
router.delete('/state-authorities/:stateId', adminController.deleteStateAuthority);

// System
router.get('/stats', adminController.getSystemStats);
router.get('/audit', adminController.getAuditLogs);

module.exports = router;
