/**
 * Seed Initial Admin User
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../models');
const config = require('../config');
const logger = require('../utils/logger');

const seedAdmin = async () => {
    try {
        await mongoose.connect(config.mongodb.uri, config.mongodb.options);
        logger.info('Connected to MongoDB');

        const adminEmail = process.argv[2] || 'admin@perseva.com';
        const adminPassword = process.argv[3] || 'Admin@123';

        // Check if admin exists
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            logger.warn(`Admin user already exists: ${adminEmail}`);
            process.exit(0);
        }

        const admin = new User({
            name: 'System Administrator',
            email: adminEmail,
            password: adminPassword,
            role: 'ADMIN',
            isActive: true,
        });

        await admin.save();
        logger.info(`Admin created successfully!`);
        logger.info(`Email: ${adminEmail}`);
        logger.info(`Password: ${adminPassword}`); // Logged only for initial setup

        process.exit(0);
    } catch (error) {
        logger.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
