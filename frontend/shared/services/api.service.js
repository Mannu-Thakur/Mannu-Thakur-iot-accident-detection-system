/**
 * API Service
 * Base HTTP client with JWT interceptors
 */

import storage from '../utils/storage.js';

class ApiService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl || import.meta.env.VITE_API_URL || 'http://localhost:8088/api';
    }

    /**
     * Get auth headers
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        const token = storage.get('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    /**
     * Handle response
     */
    async handleResponse(response) {
        const data = await response.json();

        if (!response.ok) {
            // Handle 401 - Unauthorized
            if (response.status === 401) {
                storage.remove('token');
                storage.remove('user');
                window.location.href = '/login';
            }

            const error = new Error(data.message || 'Request failed');
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    }

    /**
     * GET request
     */
    async get(endpoint, params = {}) {
        const url = new URL(this.baseUrl + endpoint);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        });

        const response = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        return this.handleResponse(response);
    }

    /**
     * POST request
     */
    async post(endpoint, body = {}) {
        const response = await fetch(this.baseUrl + endpoint, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body),
        });

        return this.handleResponse(response);
    }

    /**
     * PUT request
     */
    async put(endpoint, body = {}) {
        const response = await fetch(this.baseUrl + endpoint, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(body),
        });

        return this.handleResponse(response);
    }

    /**
     * PATCH request
     */
    async patch(endpoint, body = {}) {
        const response = await fetch(this.baseUrl + endpoint, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(body),
        });

        return this.handleResponse(response);
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        const response = await fetch(this.baseUrl + endpoint, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });

        return this.handleResponse(response);
    }

    /**
     * Upload file with multipart/form-data
     */
    async upload(endpoint, formData) {
        const token = storage.get('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(this.baseUrl + endpoint, {
            method: 'POST',
            headers,
            body: formData,
        });

        return this.handleResponse(response);
    }
}

// Export singleton instance
export const api = new ApiService();
export default api;
