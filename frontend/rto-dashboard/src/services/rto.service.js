/**
 * RTO Service
 * Complete API methods for all RTO backend endpoints
 */

import api from '@shared/services/api.service.js';

const rtoService = {
    // ==================== STATISTICS ====================
    async getStatistics() {
        const response = await api.get('/rto/statistics');
        // API returns: { success, message, data, timestamp }
        // Extract 'data' which contains the actual statistics
        const stats = response.data || response;
        console.log('[RTO Service] Statistics loaded:', stats);
        return stats;
    },

    // ==================== OWNERS ====================
    async getOwners(params = {}) {
        const response = await api.get('/rto/owners', params);
        return response;
    },

    async getOwner(ownerId) {
        const response = await api.get(`/rto/owners/${ownerId}`);
        return response.data;
    },

    async createOwner(data) {
        const response = await api.post('/rto/owners', data);
        return response.data;
    },

    async updateOwner(ownerId, data) {
        const response = await api.patch(`/rto/owners/${ownerId}`, data);
        return response.data;
    },

    // ==================== VEHICLES ====================
    async getVehicles(params = {}) {
        const response = await api.get('/rto/vehicles', params);
        return response;
    },

    async getVehicle(vehicleId) {
        const response = await api.get(`/rto/vehicles/${vehicleId}`);
        return response.data;
    },

    async registerVehicle(data) {
        const response = await api.post('/rto/vehicles', data);
        return response.data;
    },

    async updateVehicle(vehicleId, data) {
        const response = await api.put(`/rto/vehicles/${vehicleId}`, data);
        return response.data;
    },

    async deleteVehicle(vehicleId) {
        const response = await api.delete(`/rto/vehicles/${vehicleId}`);
        return response.data;
    },

    // ==================== VEHICLE ACTIONS ====================
    async getVehicleIncidents(vehicleId) {
        // POST as per backend route
        const response = await api.post(`/rto/vehicles/${vehicleId}/incidents`, {});
        return response.data;
    },

    async transferOwnership(vehicleId, data) {
        const response = await api.post(`/rto/vehicles/${vehicleId}/transfer`, data);
        return response.data;
    },

    async replaceDevice(data) {
        const response = await api.post('/rto/devices/replace', data);
        return response.data;
    },

    async replaceVehicleDevice(vehicleId, data) {
        const response = await api.post(`/rto/vehicles/${vehicleId}/device/replace`, data);
        return response.data;
    },

    // ==================== AUDIT LOGS ====================
    async getAuditLogs(params = {}) {
        const response = await api.get('/rto/audit', params);
        return response;
    },

    // ==================== STAFF ====================
    async getStaff() {
        const response = await api.get('/rto/staff');
        // API returns: { success, message, data, timestamp }
        const staffList = response.data || response;
        console.log('[RTO Service] Staff loaded:', staffList);
        return Array.isArray(staffList) ? staffList : [];
    },

    async createStaff(data) {
        const response = await api.post('/rto/staff', data);
        return response.data;
    },

    async updateStaff(staffId, data) {
        const response = await api.patch(`/rto/staff/${staffId}`, data);
        return response.data || response;
    },

    async deleteStaff(staffId) {
        const response = await api.delete(`/rto/staff/${staffId}`);
        return response.data || response;
    },
};

export default rtoService;
