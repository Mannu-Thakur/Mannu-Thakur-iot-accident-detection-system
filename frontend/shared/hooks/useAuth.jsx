/**
 * useAuth Hook
 * Authentication state and actions
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import authService from '../services/auth.service.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initialize auth state from storage
        if (authService.isAuthenticated()) {
            setUser(authService.getCurrentUser());
            setProfile(authService.getProfile());
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (email, password) => {
        const result = await authService.login(email, password);
        setUser(result.user);
        setProfile(result.profile);
        return result;
    }, []);

    const logout = useCallback(() => {
        authService.logout();
        setUser(null);
        setProfile(null);
    }, []);

    const value = {
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        hasRole: authService.hasRole.bind(authService),
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default useAuth;
