/**
 * Storage Utility
 * Wrapper for localStorage with JSON parsing
 */

const PREFIX = 'perseva_';

export const storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(PREFIX + key);
            return item ? JSON.parse(item) : defaultValue;
        } catch {
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(PREFIX + key, JSON.stringify(value));
        } catch (error) {
            console.error('Storage set error:', error);
        }
    },

    remove(key) {
        localStorage.removeItem(PREFIX + key);
    },

    clear() {
        Object.keys(localStorage)
            .filter(key => key.startsWith(PREFIX))
            .forEach(key => localStorage.removeItem(key));
    }
};

export default storage;
