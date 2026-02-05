/**
 * Auth Routes
 */
const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { authenticate } = require('../middleware');

// Login
router.post('/login', authController.login);

// Get current user (protected)
router.get('/me', authenticate, authController.getMe);

module.exports = router;
