/**
 * Models Index
 * Export all models from a single point
 */

const Owner = require('./Owner');
const Vehicle = require('./Vehicle');
const Device = require('./Device');
const Incident = require('./Incident');
const LiveAccessRequest = require('./LiveAccessRequest');
const RescueTask = require('./RescueTask');
const Employee = require('./Employee');
const LocalAuthority = require('./LocalAuthority');
const RTO = require('./RTO');
const StateAuthority = require('./StateAuthority');
const AuditLog = require('./AuditLog');
const RecentMessage = require('./RecentMessage');
const User = require('./User');

module.exports = {
    Owner,
    Vehicle,
    Device,
    Incident,
    LiveAccessRequest,
    RescueTask,
    Employee,
    LocalAuthority,
    RTO,
    StateAuthority,
    AuditLog,
    RecentMessage,
    User,
};
