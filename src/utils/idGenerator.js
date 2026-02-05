/**
 * ID Generator Utilities
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique ID with optional prefix
 */
const generateId = (prefix = '') => {
    const uuid = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
    return prefix ? `${prefix}-${uuid}` : uuid;
};

/**
 * Generate Owner ID
 */
const generateOwnerId = () => generateId('OWN');

/**
 * Generate Vehicle ID
 */
const generateVehicleId = () => generateId('VEH');

/**
 * Generate Device ID
 */
const generateDeviceId = () => generateId('DEV');

/**
 * Generate Incident ID with date
 */
const generateIncidentId = () => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const uuid = uuidv4().replace(/-/g, '').substring(0, 6).toUpperCase();
    return `INC-${date}-${uuid}`;
};

/**
 * Generate Live Access Request ID
 */
const generateRequestId = () => generateId('REQ');

/**
 * Generate Rescue Task ID
 */
const generateTaskId = () => generateId('TASK');

/**
 * Generate Employee ID
 */
const generateEmployeeId = () => generateId('EMP');

/**
 * Generate Authority ID
 */
const generateAuthorityId = () => generateId('LA');

/**
 * Generate RTO ID
 */
const generateRtoId = () => generateId('RTO');

/**
 * Generate State Authority ID
 */
const generateStateId = () => generateId('STATE');

/**
 * Generate Nominee ID
 */
const generateNomineeId = () => generateId('NOM');

/**
 * Generate Message ID (for device deduplication)
 */
const generateMessageId = () => generateId('MSG');

/**
 * Generate API Key for device
 */
const generateApiKey = () => {
    return `pk_${uuidv4().replace(/-/g, '')}`;
};

module.exports = {
    generateId,
    generateOwnerId,
    generateVehicleId,
    generateDeviceId,
    generateIncidentId,
    generateRequestId,
    generateTaskId,
    generateEmployeeId,
    generateAuthorityId,
    generateRtoId,
    generateStateId,
    generateNomineeId,
    generateMessageId,
    generateApiKey,
};
