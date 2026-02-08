/**
 * useSocket Hook
 * Socket.io connection management
 */

import { useEffect, useCallback, useState } from 'react';
import socketService from '../services/socket.service.js';
import { useAuth } from './useAuth.jsx';

export function useSocket(namespace = '/authority') {
    const { isAuthenticated } = useAuth();
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            const socket = socketService.connect(namespace);

            socket.on('connect', () => setIsConnected(true));
            socket.on('disconnect', () => setIsConnected(false));

            return () => {
                socketService.disconnect();
                setIsConnected(false);
            };
        }
    }, [isAuthenticated, namespace]);

    const subscribe = useCallback((event, callback) => {
        socketService.on(event, callback);
        return () => socketService.off(event, callback);
    }, []);

    const emit = useCallback((event, data) => {
        socketService.emit(event, data);
    }, []);

    return {
        isConnected,
        subscribe,
        emit,
        subscribeToIncidents: socketService.subscribeToIncidents.bind(socketService),
    };
}

export default useSocket;
