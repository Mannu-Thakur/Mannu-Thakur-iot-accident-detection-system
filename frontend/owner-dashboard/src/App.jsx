import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '../../shared/hooks/useAuth.jsx'
import { ToastProvider } from '../../shared/hooks/useToast.jsx'
import { ThemeProvider } from '../../shared/hooks/useTheme.jsx'
import { MainLayout } from '../../shared/components/Layout/MainLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

import Login from './views/Auth/Login.jsx'
import Dashboard from './views/Dashboard/Dashboard.jsx'
import VehicleList from './views/Vehicles/VehicleList.jsx'
import VehicleDetail from './views/Vehicles/VehicleDetail.jsx'
import Settings from './views/Settings/Settings.jsx'

const icons = {
    dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
    vehicles: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="6" width="22" height="12" rx="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="12" r="2" /></svg>,
    settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>,
}

const sidebarItems = [
    {
        title: 'My Account',
        items: [
            { path: '/', label: 'Dashboard', icon: icons.dashboard },
            { path: '/vehicles', label: 'My Vehicles', icon: icons.vehicles },
        ]
    },
    {
        title: 'System',
        items: [
            { path: '/settings', label: 'Settings', icon: icons.settings },
        ]
    }
]

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <ToastProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />

                        <Route element={<ProtectedRoute><MainLayout sidebarItems={sidebarItems} /></ProtectedRoute>}>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/vehicles" element={<VehicleList />} />
                            <Route path="/vehicles/:vehicleId" element={<VehicleDetail />} />
                            <Route path="/settings" element={<Settings />} />
                        </Route>

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </ToastProvider>
            </AuthProvider>
        </ThemeProvider>
    )
}

export default App
