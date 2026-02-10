/**
 * Employee Service
 * API calls for employee operations
 */

import api from '../../../shared/services/api.service.js';

class EmployeeService {
    /**
     * Get employees list
     */
    async getEmployees(filters = {}) {
        const response = await api.post('/authority/employees', filters);
        console.log('getEmployees response:', response);
        return response.data || [];
    }

    /**
     * Create employee
     */
    async createEmployee(data) {
        const response = await api.post('/authority/employees/create', data);
        return response.data;
    }

    /**
     * Update employee
     */
    async updateEmployee(data) {
        const response = await api.post('/authority/employees/update', data);
        return response.data;
    }

    /**
     * Delete employee
     */
    async deleteEmployee(employeeId) {
        const response = await api.post('/authority/employees/delete', { employeeId });
        return response.data;
    }

    /**
     * Get employees by status
     */
    async getEmployeesByStatus() {
        const employees = await this.getEmployees({ limit: 100 });

        return {
            available: employees.filter(e => e.status === 'AVAILABLE'),
            busy: employees.filter(e => e.status === 'BUSY_ON_TASK'),
            offline: employees.filter(e => ['OFF_DUTY', 'ON_LEAVE', 'INACTIVE'].includes(e.status)),
        };
    }
}

export const employeeService = new EmployeeService();
export default employeeService;
