/**
 * Severity Computation Service
 * Calculates incident severity based on various factors
 */
const logger = require('../utils/logger');

/**
 * Compute severity level (1-5) based on incident data
 * @param {Object} incident - Incident data
 * @returns {Number} Severity level from 1 (lowest) to 5 (highest)
 */
const computeSeverity = (incident) => {
    let score = 0;
    const factors = [];

    // AI confidence score (0-1) weighted x3
    if (incident.aiConfidenceScore !== null && incident.aiConfidenceScore !== undefined) {
        const aiScore = incident.aiConfidenceScore * 3;
        score += aiScore;
        factors.push({ factor: 'AI Confidence', value: incident.aiConfidenceScore, contribution: aiScore });
    }

    // Speed factor (only if trusted)
    if (incident.speedTrusted && incident.speed !== undefined && incident.speed !== null) {
        let speedScore = 0;
        if (incident.speed >= 120) {
            speedScore = 2;
        } else if (incident.speed >= 80) {
            speedScore = 1;
        } else if (incident.speed >= 60) {
            speedScore = 0.5;
        }
        score += speedScore;
        factors.push({ factor: 'Speed', value: incident.speed, trusted: true, contribution: speedScore });
    } else if (incident.speed !== undefined && incident.speed !== null) {
        // Untrusted speed - reduced weight
        let speedScore = 0;
        if (incident.speed >= 120) {
            speedScore = 1; // Reduced from 2
        } else if (incident.speed >= 80) {
            speedScore = 0.5; // Reduced from 1
        }
        score += speedScore;
        factors.push({ factor: 'Speed', value: incident.speed, trusted: false, contribution: speedScore });
    }

    // Airbag deployment
    if (incident.airbagsDeployed) {
        const airbagScore = incident.airbagTrusted ? 1.5 : 0.75;
        score += airbagScore;
        factors.push({ factor: 'Airbags Deployed', value: true, trusted: incident.airbagTrusted, contribution: airbagScore });
    }

    // Brake failure
    if (incident.isBreakFail) {
        const brakeScore = incident.brakeTrusted ? 1.5 : 0.75;
        score += brakeScore;
        factors.push({ factor: 'Brake Failure', value: true, trusted: incident.brakeTrusted, contribution: brakeScore });
    }

    // Free fall / rollover detection
    if (incident.isFreeFall) {
        const freeFallScore = 1.5;
        score += freeFallScore;
        factors.push({ factor: 'Free Fall Detected', value: true, contribution: freeFallScore });
    }

    // Fire detected (AI)
    if (incident.aiFireDetected) {
        score += 2.5;
        factors.push({ factor: 'Fire Detected (AI)', value: true, contribution: 2.5 });
    }

    // Water submersion (AI)
    if (incident.aiWaterSubmerged) {
        score += 2;
        factors.push({ factor: 'Water Submersion (AI)', value: true, contribution: 2 });
    }

    // Impact direction
    if (incident.impactDirection) {
        let impactScore = 0;
        switch (incident.impactDirection) {
            case 'FRONT':
                impactScore = 1;
                break;
            case 'ROLLOVER':
                impactScore = 1.5;
                break;
            case 'REAR':
            case 'LEFT':
            case 'RIGHT':
                impactScore = 0.5;
                break;
        }
        score += impactScore;
        factors.push({ factor: 'Impact Direction', value: incident.impactDirection, contribution: impactScore });
    }

    // Impact force (G-force) if available
    if (incident.impactForce !== undefined && incident.impactForce !== null) {
        let forceScore = 0;
        if (incident.impactForce >= 50) {
            forceScore = 2;
        } else if (incident.impactForce >= 30) {
            forceScore = 1.5;
        } else if (incident.impactForce >= 15) {
            forceScore = 1;
        } else if (incident.impactForce >= 5) {
            forceScore = 0.5;
        }
        score += forceScore;
        factors.push({ factor: 'Impact Force (G)', value: incident.impactForce, contribution: forceScore });
    }

    // Calculate final severity level
    // Score range: 0-12+ (theoretical max around 14)
    // Map to 1-5 scale
    let severityLevel;
    if (score >= 8) {
        severityLevel = 5;
    } else if (score >= 6) {
        severityLevel = 4;
    } else if (score >= 4) {
        severityLevel = 3;
    } else if (score >= 2) {
        severityLevel = 2;
    } else {
        severityLevel = 1;
    }

    logger.debug('Severity computed:', {
        incidentId: incident.incidentId,
        rawScore: score,
        severityLevel,
        factors,
    });

    return {
        severityLevel,
        rawScore: Math.round(score * 100) / 100,
        factors,
        requiresManualReview: !incident.speedTrusted || !incident.airbagTrusted || !incident.brakeTrusted,
    };
};

/**
 * Determine if incident requires auto-dispatch based on severity
 * @param {Number} severityLevel 
 * @param {Number} threshold 
 * @returns {Boolean}
 */
const shouldAutoDispatch = (severityLevel, threshold = 4) => {
    return severityLevel >= threshold;
};

/**
 * Get severity label
 * @param {Number} severityLevel 
 * @returns {String}
 */
const getSeverityLabel = (severityLevel) => {
    const labels = {
        1: 'LOW',
        2: 'MODERATE',
        3: 'SIGNIFICANT',
        4: 'HIGH',
        5: 'CRITICAL',
    };
    return labels[severityLevel] || 'UNKNOWN';
};

/**
 * Get severity color for UI
 * @param {Number} severityLevel 
 * @returns {String}
 */
const getSeverityColor = (severityLevel) => {
    const colors = {
        1: '#4CAF50', // Green
        2: '#8BC34A', // Light Green
        3: '#FFC107', // Amber
        4: '#FF9800', // Orange
        5: '#F44336', // Red
    };
    return colors[severityLevel] || '#9E9E9E';
};

module.exports = {
    computeSeverity,
    shouldAutoDispatch,
    getSeverityLabel,
    getSeverityColor,
};
