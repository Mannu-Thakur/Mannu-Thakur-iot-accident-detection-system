/**
 * Image Hash Utility
 * Creates hash of image for deduplication
 */
const crypto = require('crypto');
const fs = require('fs');

/**
 * Generate SHA256 hash of a file
 */
const hashFile = async (filePath) => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', (err) => reject(err));
    });
};

/**
 * Generate hash from buffer
 */
const hashBuffer = (buffer) => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Generate short hash (first 16 characters)
 */
const shortHash = (hash) => {
    return hash.substring(0, 16);
};

module.exports = {
    hashFile,
    hashBuffer,
    shortHash,
};
