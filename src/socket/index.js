/**
 * Socket.IO Setup
 * Real-time communication for devices, authorities, and employees
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const Device = require('../models/Device');
const { deviceController } = require('../controllers');
const { authorityController } = require('../controllers');

let io = null;

/**
 * Initialize Socket.IO
 * @param {http.Server} server 
 */
const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: config.cors.origin,
            methods: ['GET', 'POST'],
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Share IO instance with controllers
    deviceController.setSocketIO(io);
    authorityController.setSocketIO(io);

    // Device namespace
    const deviceNs = io.of('/device');
    deviceNs.use(deviceAuthMiddleware);
    deviceNs.on('connection', handleDeviceConnection);

    // Authority namespace
    const authorityNs = io.of('/authority');
    authorityNs.use(jwtAuthMiddleware);
    authorityNs.on('connection', handleAuthorityConnection);

    // Employee namespace
    const employeeNs = io.of('/employee');
    employeeNs.use(jwtAuthMiddleware);
    employeeNs.on('connection', handleEmployeeConnection);

    logger.info('Socket.IO initialized');

    return io;
};

/**
 * Device authentication middleware
 */
const deviceAuthMiddleware = async (socket, next) => {
    try {
        const deviceId = socket.handshake.auth.deviceId;
        const apiKey = socket.handshake.auth.apiKey;

        if (!deviceId || !apiKey) {
            return next(new Error('Device credentials required'));
        }

        const device = await Device.findByDeviceId(deviceId);
        if (!device) {
            return next(new Error('Device not found'));
        }

        const isValid = await device.validateApiKey(apiKey);
        if (!isValid) {
            return next(new Error('Invalid API key'));
        }

        socket.deviceId = deviceId;
        socket.device = device;
        next();
    } catch (error) {
        logger.error('Device socket auth error:', error);
        next(new Error('Authentication failed'));
    }
};

/**
 * JWT authentication middleware
 */
const jwtAuthMiddleware = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Token required'));
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        socket.user = decoded;
        next();
    } catch (error) {
        logger.error('Socket JWT auth error:', error);
        next(new Error('Invalid token'));
    }
};

/**
 * Handle device connection
 */
const handleDeviceConnection = async (socket) => {
    const { deviceId } = socket;

    logger.info('Device connected:', { deviceId, socketId: socket.id });

    // Update device connection status
    try {
        const device = await Device.findByDeviceId(deviceId);
        if (device) {
            device.setOnline(socket.id);
            await device.save();
        }
    } catch (error) {
        logger.error('Error updating device connection:', error);
    }

    // Join device-specific room
    socket.join(`device:${deviceId}`);

    // Handle heartbeat
    socket.on('heartbeat', async (data) => {
        try {
            const device = await Device.findByDeviceId(deviceId);
            if (device) {
                device.updateHeartbeat(data.batteryLevel, data.gps);
                await device.save();
            }
            socket.emit('heartbeat_ack', { timestamp: new Date().toISOString() });
        } catch (error) {
            logger.error('Heartbeat error:', error);
        }
    });

    // Handle live access cancel
    socket.on('live_access_cancel', async (data) => {
        // This is handled via HTTP API, but socket can be used for quick updates
        logger.debug('Live access cancel via socket:', { deviceId, requestId: data.requestId });
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
        logger.info('Device disconnected:', { deviceId, reason });

        try {
            const device = await Device.findByDeviceId(deviceId);
            if (device) {
                device.setOffline();
                await device.save();
            }
        } catch (error) {
            logger.error('Error updating device disconnect:', error);
        }
    });
};

/**
 * Handle authority connection
 */
const handleAuthorityConnection = (socket) => {
    const { user } = socket;
    const authorityId = user.authorityId;

    logger.info('Authority connected:', { authorityId, socketId: socket.id });

    // Join authority-specific room
    if (authorityId) {
        socket.join(`authority:${authorityId}`);
    }

    // Handle room subscription for incidents
    socket.on('subscribe_incidents', (data) => {
        socket.join('incidents');
        logger.debug('Authority subscribed to incidents:', { authorityId });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
        logger.info('Authority disconnected:', { authorityId, reason });
    });
};

/**
 * Handle employee connection
 */
const handleEmployeeConnection = async (socket) => {
    const { user } = socket;
    const employeeId = user.employeeId;

    logger.info('Employee connected:', { employeeId, socketId: socket.id });

    // Join employee-specific room
    if (employeeId) {
        socket.join(`employee:${employeeId}`);
    }

    // Update employee online status
    socket.on('status_update', async (data) => {
        const Employee = require('../models/Employee');
        try {
            const employee = await Employee.findByEmployeeId(employeeId);
            if (employee) {
                if (data.status) employee.status = data.status;
                if (data.location) {
                    employee.lastLocation = {
                        type: 'Point',
                        coordinates: [data.location.lon, data.location.lat],
                    };
                    employee.lastLocationUpdate = new Date();
                }
                await employee.save();
            }
        } catch (error) {
            logger.error('Employee status update error:', error);
        }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
        logger.info('Employee disconnected:', { employeeId, reason });
    });
};

/**
 * Get IO instance
 */
const getIO = () => io;

/**
 * Emit to device
 */
const emitToDevice = (deviceId, event, data) => {
    if (io) {
        io.of('/device').to(`device:${deviceId}`).emit(event, data);
    }
};

/**
 * Emit to authority
 */
const emitToAuthority = (authorityId, event, data) => {
    if (io) {
        io.of('/authority').to(`authority:${authorityId}`).emit(event, data);
    }
};

/**
 * Emit to all authorities (incidents broadcast)
 */
const broadcastIncident = (data) => {
    if (io) {
        io.of('/authority').to('incidents').emit('new_incident', data);
    }
};

/**
 * Emit to employee
 */
const emitToEmployee = (employeeId, event, data) => {
    if (io) {
        io.of('/employee').to(`employee:${employeeId}`).emit(event, data);
    }
};

module.exports = {
    initSocket,
    getIO,
    emitToDevice,
    emitToAuthority,
    broadcastIncident,
    emitToEmployee,
};
