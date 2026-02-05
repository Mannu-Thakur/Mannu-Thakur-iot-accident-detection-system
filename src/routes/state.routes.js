/**
 * State Routes
 * State Authority endpoints: analytics, oversight
 */
const express = require('express');
const router = express.Router();
const { stateController } = require('../controllers');
const { authenticate, requireStateAuth } = require('../middleware');

// All routes require state authority authentication
router.use(authenticate, requireStateAuth);

// Risk zones analytics
router.get('/risk-zones', stateController.getRiskZones);

// State incidents
router.get('/incidents', stateController.getIncidents);

// Local authorities
router.get('/authorities', stateController.getAuthorities);

// Statistics
router.get('/statistics', stateController.getStatistics);

module.exports = router;
