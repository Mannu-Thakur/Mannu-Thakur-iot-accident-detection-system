/**
 * Validations Index
 */

const rtoValidation = require('./rto.validation');
const deviceValidation = require('./device.validation');
const authorityValidation = require('./authority.validation');
const ownerValidation = require('./owner.validation');

module.exports = {
    ...rtoValidation,
    ...deviceValidation,
    ...authorityValidation,
    ...ownerValidation,
};
