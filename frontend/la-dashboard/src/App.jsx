import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '../../shared/hooks/useAuth.jsx'
import { ToastProvider } from '../../shared/hooks/useToast.jsx'
import { ThemeProvider } from '../../shared/hooks/useTheme.jsx'
import { MainLayout } from '../../shared/components/Layout/MainLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

// Views
import Login from './views/Auth/Login.jsx'
import Dashboard from './views/Dashboard/Dashboard.jsx'
import IncidentList from './views/Incidents/IncidentList.jsx'
import IncidentDetail from './views/Incidents/IncidentDetail.jsx'
import EmployeeList from './views/Employees/EmployeeList.jsx'
import EmployeeForm from './views/Employees/EmployeeForm.jsx'
import TaskList from './views/Tasks/TaskList.jsx'
import Settings from './views/Settings/Settings.jsx'

// Icons
const icons = {
    dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
    incidents: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4M12 17h.01" /></svg>,
    team: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>,
    tasks: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>,
    settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>,
}

const sidebarItems = [
    {
        title: 'Main',
        items: [
            { path: '/', label: 'Dashboard', icon: icons.dashboard },
            { path: '/incidents', label: 'Incidents', icon: icons.incidents },
        ]
    },
    {
        title: 'Management',
        items: [
            { path: '/team', label: 'Team', icon: icons.team },
            { path: '/tasks', label: 'Tasks', icon: icons.tasks },
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
                            <Route path="/incidents" element={<IncidentList />} />
                            <Route path="/incidents/:incidentId" element={<IncidentDetail />} />
                            <Route path="/team" element={<EmployeeList />} />
                            <Route path="/team/new" element={<EmployeeForm />} />
                            <Route path="/team/:employeeId" element={<EmployeeForm />} />
                            <Route path="/tasks" element={<TaskList />} />
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
