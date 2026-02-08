/**
 * Employee Service
 * API calls for employee operations
 */

import api from '../../../../shared/services/api.service.js';

class EmployeeService {
    /**
     * Get employees list
     */
    async getEmployees(filters = {}) {
        const response = await api.post('/authority/employees', filters);
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
