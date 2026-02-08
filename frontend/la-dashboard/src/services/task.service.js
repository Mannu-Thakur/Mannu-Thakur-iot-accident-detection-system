/**
 * Task Service
 * API calls for rescue task operations
 */

import api from '../../../../shared/services/api.service.js';

class TaskService {
    /**
     * Get tasks list
     */
    async getTasks(filters = {}) {
        const response = await api.post('/authority/tasks', filters);
        return response.data || [];
    }

    /**
     * Assign task
     */
    async assignTask(data) {
        const response = await api.post('/authority/tasks/assign', data);
        return response.data;
    }

    /**
     * Update task
     */
    async updateTask(data) {
        const response = await api.post('/authority/tasks/update', data);
        return response.data;
    }
}

export const taskService = new TaskService();
export default taskService;
