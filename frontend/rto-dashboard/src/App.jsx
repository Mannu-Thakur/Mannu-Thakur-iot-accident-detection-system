import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@shared/hooks/useAuth.jsx'
import { ToastProvider } from '@shared/hooks/useToast.jsx'
import { ThemeProvider } from '@shared/hooks/useTheme.jsx'
import { MainLayout } from '@shared/components/Layout/MainLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

// Views
import Login from './views/Auth/Login.jsx'
import Dashboard from './views/Dashboard/Dashboard.jsx'
import VehicleList from './views/Vehicles/VehicleList.jsx'
import VehicleForm from './views/Vehicles/VehicleForm.jsx'
import VehicleDetail from './views/Vehicles/VehicleDetail.jsx'
import OwnerList from './views/Owners/OwnerList.jsx'
import OwnerForm from './views/Owners/OwnerForm.jsx'
import OwnerDetail from './views/Owners/OwnerDetail.jsx'
import AuditLogs from './views/AuditLogs/AuditLogs.jsx'
import Staff from './views/Staff/Staff.jsx'
import Settings from './views/Settings/Settings.jsx'

// Icons
const icons = {
    dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
    vehicles: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="6" width="22" height="12" rx="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="12" r="2" /></svg>,
    owners: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    audit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>,
    staff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>,
    settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>,
    registerVehicle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>,
    registerOwner: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" /></svg>,
}

const sidebarItems = [
    {
        title: 'Main',
        items: [
            { path: '/', label: 'Dashboard', icon: icons.dashboard },
        ]
    },
    {
        title: 'Registry',
        items: [
            { path: '/vehicles', label: 'Vehicles', icon: icons.vehicles },
            { path: '/owners', label: 'Owners', icon: icons.owners },
        ]
    },
    {
        title: 'Quick Actions',
        items: [
            { path: '/vehicles/new', label: 'Register Vehicle', icon: icons.registerVehicle },
            { path: '/owners/new', label: 'Register Owner', icon: icons.registerOwner },
        ]
    },
    {
        title: 'Administration',
        items: [
            { path: '/audit', label: 'Audit Logs', icon: icons.audit },
            { path: '/staff', label: 'Staff Management', icon: icons.staff },
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
                            {/* Dashboard */}
                            <Route path="/" element={<Dashboard />} />

                            {/* Vehicles */}
                            <Route path="/vehicles" element={<VehicleList />} />
                            <Route path="/vehicles/new" element={<VehicleForm />} />
                            <Route path="/vehicles/:vehicleId" element={<VehicleDetail />} />
                            <Route path="/vehicles/:vehicleId/edit" element={<VehicleForm />} />

                            {/* Owners */}
                            <Route path="/owners" element={<OwnerList />} />
                            <Route path="/owners/new" element={<OwnerForm />} />
                            <Route path="/owners/:ownerId" element={<OwnerDetail />} />
                            <Route path="/owners/:ownerId/edit" element={<OwnerForm />} />

                            {/* Administration */}
                            <Route path="/audit" element={<AuditLogs />} />
                            <Route path="/staff" element={<Staff />} />

                            {/* Settings */}
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
