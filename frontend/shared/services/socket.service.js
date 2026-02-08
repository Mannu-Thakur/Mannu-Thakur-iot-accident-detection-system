/**
 * Socket Service
 * Socket.io client wrapper for real-time communication
 */

import { io } from 'socket.io-client';
import storage from '../utils/storage.js';

class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
    }

    /**
     * Connect to socket server
     */
    connect(namespace = '/authority') {
        const token = storage.get('token');
        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8088';

        if (this.socket?.connected) {
            return this.socket;
        }

        this.socket = io(`${socketUrl}${namespace}`, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            console.log('[Socket] Connected:', this.socket.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error.message);
        });

        return this.socket;
    }

    /**
     * Disconnect from socket
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.listeners.clear();
        }
    }

    /**
     * Subscribe to an event
     */
    on(event, callback) {
        if (!this.socket) {
            console.warn('[Socket] Not connected');
            return;
        }

        this.socket.on(event, callback);

        // Track listeners for cleanup
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Unsubscribe from an event
     */
    off(event, callback) {
        if (!this.socket) return;

        if (callback) {
            this.socket.off(event, callback);
        } else {
            this.socket.off(event);
        }

        if (this.listeners.has(event)) {
            if (callback) {
                const callbacks = this.listeners.get(event);
                const index = callbacks.indexOf(callback);
                if (index > -1) callbacks.splice(index, 1);
            } else {
                this.listeners.delete(event);
            }
        }
    }

    /**
     * Emit event to server
     */
    emit(event, data) {
        if (!this.socket?.connected) {
            console.warn('[Socket] Not connected, cannot emit:', event);
            return;
        }
        this.socket.emit(event, data);
    }

    /**
     * Subscribe to incidents (LA specific)
     */
    subscribeToIncidents() {
        this.emit('subscribe_incidents');
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.socket?.connected || false;
    }
}

// Export singleton
export const socketService = new SocketService();
export default socketService;
