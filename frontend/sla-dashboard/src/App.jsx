import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '../../shared/hooks/useAuth.jsx'
import { ToastProvider } from '../../shared/hooks/useToast.jsx'
import { ThemeProvider } from '../../shared/hooks/useTheme.jsx'
import { MainLayout } from '../../shared/components/Layout/MainLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

// Views
import Login from './views/Auth/Login.jsx'
import Dashboard from './views/Dashboard/Dashboard.jsx'
import AuthorityList from './views/Authorities/AuthorityList.jsx'
import AuthorityForm from './views/Authorities/AuthorityForm.jsx'
import AuthorityDetail from './views/Authorities/AuthorityDetail.jsx'
import LAMapView from './views/Maps/LAMapView.jsx'
import Analytics from './views/Analytics/Analytics.jsx'
import Settings from './views/Settings/Settings.jsx'

// Icons
const icons = {
    dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
    authorities: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 7v14M21 7v14M6 7v.01M12 7v.01M18 7v.01M6 3h12l3 4H3l3-4z" /></svg>,
    map: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>,
    analytics: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>,
    settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>,
}

const sidebarItems = [
    {
        title: 'Overview',
        items: [
            { path: '/', label: 'Dashboard', icon: icons.dashboard },
        ]
    },
    {
        title: 'LA Management',
        items: [
            { path: '/authorities', label: 'Local Authorities', icon: icons.authorities },
            { path: '/authorities/map', label: 'Map View', icon: icons.map },
        ]
    },
    {
        title: 'Insights',
        items: [
            { path: '/analytics', label: 'Analytics', icon: icons.analytics },
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
                            <Route path="/authorities" element={<AuthorityList />} />
                            <Route path="/authorities/map" element={<LAMapView />} />
                            <Route path="/authorities/new" element={<AuthorityForm />} />
                            <Route path="/authorities/:authorityId" element={<AuthorityDetail />} />
                            <Route path="/authorities/:authorityId/edit" element={<AuthorityForm />} />
                            <Route path="/analytics" element={<Analytics />} />
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
