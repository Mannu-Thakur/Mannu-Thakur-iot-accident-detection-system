/**
 * Express Application Setup
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const routes = require('./routes');
const { notFoundHandler, errorHandler, defaultLimiter } = require('./middleware');
const logger = require('./utils/logger');

const app = express();

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
    origin: config.cors.origin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Key'],
    credentials: true,
}));

// Request logging
if (config.env !== 'test') {
    app.use(morgan('combined', {
        stream: { write: (message) => logger.http(message.trim()) },
    }));
}

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (applied globally, specific routes may override)
if (config.rateLimit.enabled) {
    app.use('/api', defaultLimiter);
}

// Serve uploaded files (in production, use CDN/S3)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Perseva API',
        description: 'Accident Detection & Rescue Coordination Platform',
        version: '1.0.0',
        status: 'running',
        docs: '/api/health',
    });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;
