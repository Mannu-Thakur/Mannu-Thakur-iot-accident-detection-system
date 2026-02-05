/**
 * AI Analysis Job
 * Processes incident images for AI analysis
 */
const { Incident } = require('../models');
const { severityService, auditService } = require('../services');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Process AI analysis for an incident
 * In production, this would be handled by a Bull queue
 * @param {Object} job - { incidentId, imageUrl }
 */
const processAIAnalysis = async (job) => {
    const { incidentId, imageUrl } = job;

    logger.info('Starting AI analysis:', { incidentId, imageUrl });

    try {
        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, config.env === 'test' ? 100 : 2000));

        // Get incident
        const incident = await Incident.findByIncidentId(incidentId);
        if (!incident) {
            logger.warn('Incident not found for AI analysis:', { incidentId });
            return;
        }

        // Skip if already processed
        if (incident.status !== 'AI_PROCESSING' && incident.status !== 'REPORTED') {
            logger.info('Incident already processed:', { incidentId, status: incident.status });
            return;
        }

        // ===== MOCK AI ANALYSIS =====
        // In production, call actual AI service (e.g., TensorFlow, AWS Rekognition, custom model)
        const aiResults = mockAIAnalysis(imageUrl);

        // Update incident with AI results
        incident.aiConfidenceScore = aiResults.confidenceScore;
        incident.aiFireDetected = aiResults.fireDetected;
        incident.aiWaterSubmerged = aiResults.waterSubmerged;
        incident.aiAnalyzedAt = new Date();

        // Determine status based on AI results
        if (aiResults.confidenceScore < config.ai.falsePositiveThreshold) {
            incident.status = 'FALSE_POSITIVE';
            logger.info('Incident marked as false positive:', { incidentId, confidence: aiResults.confidenceScore });
        } else {
            incident.status = 'VERIFIED';

            // Recompute severity with AI results
            const severityResult = severityService.computeSeverity(incident);
            incident.severityLevel = severityResult.severityLevel;
        }

        await incident.save();

        // Audit log
        await auditService.logAIAnalysisCompleted(incidentId, {
            confidenceScore: aiResults.confidenceScore,
            fireDetected: aiResults.fireDetected,
            waterSubmerged: aiResults.waterSubmerged,
            newStatus: incident.status,
            severityLevel: incident.severityLevel,
        });

        logger.info('AI analysis completed:', {
            incidentId,
            status: incident.status,
            confidence: aiResults.confidenceScore,
            fire: aiResults.fireDetected,
            water: aiResults.waterSubmerged,
            severity: incident.severityLevel,
        });

        // If false positive, cancel any pending live access requests
        if (incident.status === 'FALSE_POSITIVE' && incident.liveAccessRequestId) {
            const LiveAccessRequest = require('../models/LiveAccessRequest');
            const liveRequest = await LiveAccessRequest.findByRequestId(incident.liveAccessRequestId);
            if (liveRequest && liveRequest.status === 'PENDING') {
                liveRequest.cancel('SYSTEM', 'Incident marked as false positive');
                await liveRequest.save();
                logger.info('Live access request cancelled due to false positive:', {
                    requestId: incident.liveAccessRequestId
                });
            }
        }

    } catch (error) {
        logger.error('AI analysis error:', { incidentId, error: error.message });

        // Update incident status to indicate processing failure
        try {
            const incident = await Incident.findByIncidentId(incidentId);
            if (incident && incident.status === 'AI_PROCESSING') {
                incident.status = 'VERIFIED'; // Default to verified on AI failure
                await incident.save();
            }
        } catch (updateError) {
            logger.error('Failed to update incident after AI error:', updateError);
        }
    }
};

/**
 * Mock AI analysis results
 * Replace with actual AI service integration
 * @param {String} imageUrl 
 * @returns {Object} AI results
 */
const mockAIAnalysis = (imageUrl) => {
    // Simulate random analysis results for demo
    const random = Math.random();

    // 80% chance of true incident, 20% false positive
    const confidenceScore = random < 0.2 ? Math.random() * 0.3 : 0.5 + Math.random() * 0.5;

    // 10% chance of fire, 5% chance of water
    const fireDetected = Math.random() < 0.1;
    const waterSubmerged = Math.random() < 0.05;

    return {
        confidenceScore: Math.round(confidenceScore * 100) / 100,
        fireDetected,
        waterSubmerged,
        objects: ['vehicle', 'debris', 'road'],
        damageLevel: confidenceScore > 0.7 ? 'HIGH' : confidenceScore > 0.5 ? 'MEDIUM' : 'LOW',
    };
};

/**
 * Re-analyze an incident (admin function)
 */
const reanalyzeIncident = async (incidentId) => {
    const incident = await Incident.findByIncidentId(incidentId);
    if (!incident) {
        throw new Error('Incident not found');
    }

    if (!incident.imageUrl) {
        throw new Error('No image to analyze');
    }

    incident.status = 'AI_PROCESSING';
    await incident.save();

    return processAIAnalysis({ incidentId, imageUrl: incident.imageUrl });
};

module.exports = {
    processAIAnalysis,
    mockAIAnalysis,
    reanalyzeIncident,
};
