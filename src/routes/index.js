/**
 * Routes Index
 * Mount all routes
 */
const express = require('express');
const router = express.Router();

const rtoRoutes = require('./rto.routes');
const deviceRoutes = require('./device.routes');
const authorityRoutes = require('./authority.routes');
const ownerRoutes = require('./owner.routes');
const stateRoutes = require('./state.routes');
const adminRoutes = require('./admin.routes');
const authRoutes = require('./auth.routes');

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// Mount routes
router.use('/rto', rtoRoutes);
router.use('/devices', deviceRoutes);
router.use('/authority', authorityRoutes);
router.use('/owner', ownerRoutes);
router.use('/state', stateRoutes);
router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);

module.exports = router;
