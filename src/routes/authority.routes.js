/**
 * Authority Routes
 * Local Authority endpoints: incidents, live access, rescue tasks
 */
const express = require('express');
const router = express.Router();
const { authorityController } = require('../controllers');
const { authenticate, requireLocalAuth, validateBody, validateQuery, validateParams } = require('../middleware');
const {
    liveAccessRequestSchema, assignTaskSchema, updateTaskSchema,
    incidentsQuerySchema, tasksQuerySchema, employeesQuerySchema, createEmployeeSchema
} = require('../validations');
const Joi = require('joi');

// Param validation
const authorityIdParam = Joi.object({ authorityId: Joi.string().required() });
const incidentIdParam = Joi.object({ authorityId: Joi.string().required(), incidentId: Joi.string().required() });
const requestIdParam = Joi.object({ authorityId: Joi.string().required(), requestId: Joi.string().required() });
const taskIdParam = Joi.object({ authorityId: Joi.string().required(), taskId: Joi.string().required() });

// All routes require Local Authority authentication
router.use(authenticate, requireLocalAuth);

// Incidents
router.get('/:authorityId/incidents', validateParams(authorityIdParam), validateQuery(incidentsQuerySchema), authorityController.getIncidents);
router.get('/:authorityId/incidents/:incidentId', validateParams(incidentIdParam), authorityController.getIncidentDetails);

// Live access
router.post('/:authorityId/live-access/request', validateParams(authorityIdParam), validateBody(liveAccessRequestSchema), authorityController.requestLiveAccess);
router.get('/:authorityId/live-access/:requestId', validateParams(requestIdParam), authorityController.getLiveAccessStatus);
router.post('/live-access/:requestId/respond', authorityController.respondToLiveAccess); // Device calls this

// Rescue tasks
router.post('/:authorityId/tasks', validateParams(authorityIdParam), validateBody(assignTaskSchema), authorityController.assignTask);
router.get('/:authorityId/tasks', validateParams(authorityIdParam), validateQuery(tasksQuerySchema), authorityController.getTasks);
router.patch('/:authorityId/tasks/:taskId', validateParams(taskIdParam), validateBody(updateTaskSchema), authorityController.updateTask);

// Employees
router.get('/:authorityId/employees', validateParams(authorityIdParam), validateQuery(employeesQuerySchema), authorityController.getEmployees);
router.post('/:authorityId/employees', validateParams(authorityIdParam), validateBody(createEmployeeSchema), authorityController.createEmployee);

module.exports = router;
