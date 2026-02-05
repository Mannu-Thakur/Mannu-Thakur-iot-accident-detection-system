/**
 * Server Entry Point
 */
const http = require('http');
const app = require('./app');
const config = require('./config');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { initSocket } = require('./socket');
const { liveAccessExpiryJob } = require('./jobs');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Graceful shutdown
const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);

    // Stop background jobs
    liveAccessExpiryJob.stopExpiryChecker();

    // Close server
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
const startServer = async () => {
    try {
        // Connect to database
        await connectDB();

        // Start background jobs
        liveAccessExpiryJob.startExpiryChecker();

        // Start listening
        server.listen(config.port, () => {
            logger.info(`Server running on port ${config.port} in ${config.env} mode`);
            logger.info(`API available at http://localhost:${config.port}/api`);
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = server;
