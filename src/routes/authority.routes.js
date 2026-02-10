/**
 * Authority Routes
 * Local Authority endpoints: incidents, live access, rescue tasks
 * Note: authorityId is passed in request body, not URL params
 */
const express = require('express');
const router = express.Router();
const { authorityController } = require('../controllers');
const { authenticate, requireLocalAuth, validateBody, validateQuery } = require('../middleware');
const {
    liveAccessRequestSchema, assignTaskSchema, updateTaskSchema,
    incidentsQuerySchema, tasksQuerySchema, employeesQuerySchema, createEmployeeSchema
} = require('../validations');
const Joi = require('joi');

// Body schemas for authorityId
const authorityIdBodySchema = Joi.object({
    authorityId: Joi.string().optional(), // Optional - can use from auth token
});

// All routes require Local Authority authentication
router.use(authenticate, requireLocalAuth);

// Incidents - POST with filters in body
router.post('/incidents', authorityController.getIncidents);
router.post('/incidents/details', authorityController.getIncidentDetails);

// Live access
router.post('/live-access/request', validateBody(liveAccessRequestSchema), authorityController.requestLiveAccess);
router.post('/live-access/status', authorityController.getLiveAccessStatus);
router.post('/live-access/respond', authorityController.respondToLiveAccess); // Device calls this

// Rescue tasks
router.post('/tasks/assign', validateBody(assignTaskSchema), authorityController.assignTask);
router.post('/tasks', authorityController.getTasks);
router.post('/tasks/update', validateBody(updateTaskSchema), authorityController.updateTask);

// Employees
router.post('/employees', authorityController.getEmployees);
router.post('/employees/create', validateBody(createEmployeeSchema), authorityController.createEmployee);
router.post('/employees/update', authorityController.updateEmployee);
router.post('/employees/delete', authorityController.deleteEmployee);

module.exports = router;

