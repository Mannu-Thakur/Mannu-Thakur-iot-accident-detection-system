/**
 * MongoDB Database Connection
 */
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('./index');

/**
 * Connect to MongoDB
 */
const connectDatabase = async () => {
    try {
        const conn = await mongoose.connect(config.mongodb.uri, config.mongodb.options);

        logger.info(`MongoDB Connected: ${conn.connection.host}`);

        // Connection event handlers
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed through app termination');
            process.exit(0);
        });

        return conn;
    } catch (error) {
        logger.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

module.exports = connectDatabase;
