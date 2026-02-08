/**
 * Auth Service
 * Handles authentication operations
 */

import api from './api.service.js';
import storage from '../utils/storage.js';

class AuthService {
    /**
     * Login user
     */
    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });

        if (response.success && response.data) {
            const { token, user, profile } = response.data;

            // Store token and user data
            storage.set('token', token);
            storage.set('user', user);
            if (profile) {
                storage.set('profile', profile);
            }

            return { user, profile };
        }

        throw new Error(response.message || 'Login failed');
    }

    /**
     * Logout user
     */
    logout() {
        storage.remove('token');
        storage.remove('user');
        storage.remove('profile');
        window.location.href = '/login';
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return storage.get('user');
    }

    /**
     * Get user profile
     */
    getProfile() {
        return storage.get('profile');
    }

    /**
     * Get token
     */
    getToken() {
        return storage.get('token');
    }

    /**
     * Check if authenticated
     */
    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;

        // Check if token is expired
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 > Date.now();
        } catch {
            return false;
        }
    }

    /**
     * Get user role
     */
    getUserRole() {
        const user = this.getCurrentUser();
        return user?.role || null;
    }

    /**
     * Check if user has specific role
     */
    hasRole(role) {
        const user = this.getCurrentUser();
        if (!user) return false;

        if (Array.isArray(user.roles)) {
            return user.roles.includes(role);
        }
        return user.role === role;
    }
}

// Export singleton
export const authService = new AuthService();
export default authService;
