/**
 * Controllers Index
 */

const rtoController = require('./rto.controller');
const deviceController = require('./device.controller');
const authorityController = require('./authority.controller');
const ownerController = require('./owner.controller');
const stateController = require('./state.controller');
const adminController = require('./admin.controller');
const authController = require('./auth.controller');

module.exports = {
    rtoController,
    deviceController,
    authorityController,
    ownerController,
    stateController,
    adminController,
};
