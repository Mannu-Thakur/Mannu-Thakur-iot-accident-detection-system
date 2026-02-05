/**
 * Jobs Index
 */

const aiAnalysisJob = require('./aiAnalysis.job');
const liveAccessExpiryJob = require('./liveAccessExpiry.job');

module.exports = {
    aiAnalysisJob,
    liveAccessExpiryJob,
};
