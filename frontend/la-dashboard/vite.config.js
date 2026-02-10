import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@shared': path.resolve(__dirname, '../shared'),
            '@': path.resolve(__dirname, './src'),
            'socket.io-client': path.resolve(__dirname, 'node_modules/socket.io-client'),
        },
    },
    server: {
        port: 5173,
        open: true,
    },
})
