/**
 * Owner Service
 */

import api from '../../../../shared/services/api.service.js';

class OwnerService {
    async getProfile() {
        const response = await api.post('/owner/profile');
        return response.data;
    }

    async getMyVehicles() {
        const response = await api.post('/owner/vehicles');
        return response.data || [];
    }

    async getVehicleDetails(vehicleId) {
        const response = await api.post('/owner/vehicles/details', { vehicleId });
        return response.data;
    }

    async getVehicleIncidents(vehicleId) {
        const response = await api.post('/owner/vehicles/incidents', { vehicleId });
        return response.data || [];
    }

    async getNominees() {
        const response = await api.post('/owner/nominees');
        return response.data || [];
    }

    async addNominee(data) {
        const response = await api.post('/owner/nominees/add', data);
        return response.data;
    }
}

export const ownerService = new OwnerService();
export default ownerService;
