/**
 * RTO Routes
 * All RTO-only endpoints: owner creation, vehicle registration, transfers
 */
const express = require('express');
const router = express.Router();
const { rtoController } = require('../controllers');
const { authenticate, requireRTO, validateBody, validateQuery, validateParams } = require('../middleware');
const {
    createOwnerSchema, updateOwnerSchema, registerVehicleSchema,
    transferOwnershipSchema, replaceDeviceSchema,
    listOwnersQuerySchema, listVehiclesQuerySchema, auditQuerySchema
} = require('../validations');
const Joi = require('joi');

// Param validation
const idParamSchema = Joi.object({ ownerId: Joi.string().required() });
const vehicleIdParamSchema = Joi.object({ vehicleId: Joi.string().required() });

// All routes require RTO authentication
router.use(authenticate, requireRTO);

// Owner routes
router.post('/owners', validateBody(createOwnerSchema), rtoController.createOwner);
router.get('/owners', validateQuery(listOwnersQuerySchema), rtoController.listOwners);
router.get('/owners/:ownerId', validateParams(idParamSchema), rtoController.getOwner);
router.patch('/owners/:ownerId', validateParams(idParamSchema), validateBody(updateOwnerSchema), rtoController.updateOwner);

// Vehicle routes
router.post('/vehicles', validateBody(registerVehicleSchema), rtoController.registerVehicle);
router.get('/vehicles', validateQuery(listVehiclesQuerySchema), rtoController.listVehicles);
router.get('/vehicles/:vehicleId', validateParams(vehicleIdParamSchema), rtoController.getVehicle);
router.post('/vehicles/:vehicleId/transfer', validateParams(vehicleIdParamSchema), validateBody(transferOwnershipSchema), rtoController.transferOwnership);

// Device replacement
router.post('/devices/replace', validateBody(replaceDeviceSchema), rtoController.replaceDevice);

// Audit logs
router.get('/audit', validateQuery(auditQuerySchema), rtoController.getAuditLogs);

module.exports = router;
