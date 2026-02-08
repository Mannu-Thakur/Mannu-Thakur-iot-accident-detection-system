/**
 * State Authority Service
 */

import api from '../../../shared/services/api.service.js';

class StateService {
    /**
     * Get state statistics
     */
    /**
     * Get state statistics
     */
    async getStatistics(state, days) {
        const response = await api.get('/state/statistics', { params: { state, days } });
        return response.data;
    }

    /**
     * Get local authorities list
     */
    async getAuthorities(filters = {}) {
        const response = await api.post('/state/authorities/list', filters);
        return response.data;
    }

    /**
     * Get single authority
     */
    async getAuthority(authorityId) {
        const response = await api.get(`/state/authorities/${authorityId}`);
        return response.data;
    }

    /**
     * Get incidents across state
     */
    async getIncidents(params = {}) {
        const response = await api.get('/state/incidents', { params });
        return response.data;
    }

    /**
     * Get incidents by district (for map)
     */
    async getIncidentsByDistrict(state) {
        const response = await api.get('/state/incidents/by-district', { params: { state } });
        return response.data;
    }

    /**
     * Get risk zones
     */
    async getRiskZones(params = {}) {
        const response = await api.get('/state/risk-zones', { params });
        return response.data;
    }

    /**
     * Create local authority
     */
    async createAuthority(data) {
        const response = await api.post('/state/authorities', data);
        return response.data;
    }

    /**
     * Update local authority
     */
    async updateAuthority(authorityId, data) {
        const response = await api.put(`/state/authorities/${authorityId}`, data);
        return response.data;
    }

    /**
     * Delete local authority
     */
    async deleteAuthority(authorityId) {
        const response = await api.delete(`/state/authorities/${authorityId}`);
        return response.data;
    }
}

export const stateService = new StateService();
export default stateService;
