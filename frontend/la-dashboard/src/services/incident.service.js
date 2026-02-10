/**
 * Incident Service
 * API calls for incident operations
 */

import api from '../../../shared/services/api.service.js';

class IncidentService {
    /**
     * Get incidents list
     */
    async getIncidents(filters = {}) {
        const response = await api.post('/authority/incidents', filters);
        return response.data || [];
    }

    /**
     * Get incident details
     */
    async getIncidentDetails(incidentId) {
        const response = await api.post('/authority/incidents/details', { incidentId });
        return response.data;
    }

    /**
     * Get dashboard stats
     */
    async getDashboardStats() {
        // Get today's incidents
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [allIncidents, todayIncidents] = await Promise.all([
            api.post('/authority/incidents', { limit: 1000 }),
            api.post('/authority/incidents', {
                fromDate: today.toISOString(),
                limit: 1000
            }),
        ]);

        const all = allIncidents.data || [];
        const todayData = todayIncidents.data || [];

        return {
            total: all.length,
            today: todayData.length,
            pending: all.filter(i => ['REPORTED', 'VERIFIED', 'AI_PROCESSING'].includes(i.status)).length,
            critical: all.filter(i => i.severityLevel >= 4).length,
            resolved: all.filter(i => i.status === 'RESOLVED').length,
        };
    }
}

export const incidentService = new IncidentService();
export default incidentService;
