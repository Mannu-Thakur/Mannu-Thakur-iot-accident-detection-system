/**
 * Owner Routes
 * Owner endpoints: profile, vehicles, nominees
 */
const express = require('express');
const router = express.Router();
const { ownerController } = require('../controllers');
const { authenticate, requireOwner, validateBody, validateQuery } = require('../middleware');
const { updateNomineesSchema, ownerIncidentsQuerySchema } = require('../validations');

// All routes require owner authentication
router.use(authenticate, requireOwner);

// Profile
router.get('/profile', ownerController.getProfile);

// Vehicles
router.get('/vehicles', ownerController.getVehicles);

// Nominees
router.put('/nominees', validateBody(updateNomineesSchema), ownerController.updateNominees);

// Incidents
router.get('/incidents', validateQuery(ownerIncidentsQuerySchema), ownerController.getIncidents);

module.exports = router;
