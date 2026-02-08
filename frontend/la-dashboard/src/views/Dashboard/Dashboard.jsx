/**
 * Dashboard Page
 * LA Dashboard with stats, charts, map, and team status
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../../../shared/hooks/useSocket.jsx';
import { useToast } from '../../../../shared/hooks/useToast.jsx';
import incidentService from '../../services/incident.service.js';
import employeeService from '../../services/employee.service.js';
import StatsCards from './StatsCards.jsx';
import TeamBoard from './TeamBoard.jsx';
import RecentIncidents from './RecentIncidents.jsx';
import IncidentChart from './IncidentChart.jsx';

function Dashboard() {
    const [stats, setStats] = useState({
        total: 0, today: 0, pending: 0, critical: 0, resolved: 0
    });
    const [teamStatus, setTeamStatus] = useState({
        available: [], busy: [], offline: []
    });
    const [recentIncidents, setRecentIncidents] = useState([]);
    const [loading, setLoading] = useState(true);

    const { subscribe, subscribeToIncidents, isConnected } = useSocket('/authority');
    const { info } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        loadDashboardData();

        // Subscribe to real-time incidents
        if (isConnected) {
            subscribeToIncidents();
        }
    }, [isConnected]);

    useEffect(() => {
        // Listen for new incidents
        const unsubscribe = subscribe('incident_alert', (data) => {
            info(`New incident reported: ${data.incidentId}`);
            loadDashboardData(); // Refresh data
        });

        return unsubscribe;
    }, [subscribe, info]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            const [statsData, teamData, incidentsData] = await Promise.all([
                incidentService.getDashboardStats(),
                employeeService.getEmployeesByStatus(),
                incidentService.getIncidents({ limit: 10 }),
            ]);

            setStats(statsData);
            setTeamStatus(teamData);
            setRecentIncidents(incidentsData);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleIncidentClick = (incidentId) => {
        navigate(`/incidents/${incidentId}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ height: 400 }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Overview of incidents and team status</p>
                </div>
                <div className="flex items-center gap-sm">
                    <span className={`badge ${isConnected ? 'badge-success' : 'badge-gray'}`}>
                        {isConnected ? '● Live' : '○ Offline'}
                    </span>
                </div>
            </div>

            <StatsCards stats={stats} />

            <div className="dashboard-grid">
                <div className="dashboard-col-8">
                    <IncidentChart />
                </div>
                <div className="dashboard-col-4">
                    <TeamBoard teamStatus={teamStatus} />
                </div>
                <div className="dashboard-col-12">
                    <RecentIncidents
                        incidents={recentIncidents}
                        onIncidentClick={handleIncidentClick}
                    />
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
