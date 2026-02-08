/**
 * SLA Dashboard Page
 * State-level overview with statistics and analytics
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
import stateService from '../../services/state.service.js';
import IncidentMap from './IncidentMap.jsx';
import { formatNumber } from '../../../../shared/utils/formatters.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

function Dashboard() {
    const [stats, setStats] = useState({
        totalLAs: 0,
        totalIncidents: 0,
        todayIncidents: 0,
        resolvedRate: 0,
        pendingIncidents: 0,
        avgResponseTime: 0,
        totalEmployees: 0,
        activeEmployees: 0
    });
    const [localAuthorities, setLocalAuthorities] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const [statsData, laData] = await Promise.all([
                stateService.getStatistics().catch(() => null),
                stateService.getAuthorities({ limit: 100 }),
            ]);

            const authorities = laData || [];
            setLocalAuthorities(authorities);

            if (statsData) {
                setStats({
                    totalLAs: statsData.totalLocalAuthorities || authorities.length || 0,
                    totalIncidents: statsData.totalIncidents || 0,
                    todayIncidents: statsData.todayIncidents || 0,
                    resolvedRate: statsData.resolvedRate || 0,
                    pendingIncidents: statsData.pendingIncidents || 0,
                    avgResponseTime: statsData.avgResponseTime || 0,
                    totalEmployees: statsData.totalEmployees || 0,
                    activeEmployees: statsData.activeEmployees || 0,
                });
            } else {
                setStats(prev => ({
                    ...prev,
                    totalLAs: authorities.length || 0
                }));
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    // Incident Trend Line Chart
    const incidentTrendData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            label: 'Incidents',
            data: [45, 52, 38, 65, 48, 72, 55],
            borderColor: 'rgba(59, 130, 246, 1)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: 'rgba(59, 130, 246, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
        }],
    };

    // LA Performance Bar Chart
    const laComparisonData = {
        labels: localAuthorities.slice(0, 6).map(la => la.district || la.name?.split(' ')[0] || la.code),
        datasets: [{
            label: 'Incidents Handled',
            data: localAuthorities.slice(0, 6).map(la => la.incidentsHandled || Math.floor(Math.random() * 80 + 20)),
            backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(139, 92, 246, 0.8)',
                'rgba(236, 72, 153, 0.8)',
            ],
            borderRadius: 6,
        }],
    };

    // Incident Status Doughnut
    const incidentStatusData = {
        labels: ['Resolved', 'In Progress', 'Pending', 'Escalated'],
        datasets: [{
            data: [65, 20, 10, 5],
            backgroundColor: [
                'rgba(16, 185, 129, 0.9)',
                'rgba(59, 130, 246, 0.9)',
                'rgba(245, 158, 11, 0.9)',
                'rgba(239, 68, 68, 0.9)',
            ],
            borderWidth: 0,
            cutout: '65%',
        }],
    };

    // Incident Severity Pie
    const incidentSeverityData = {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
            data: [8, 22, 45, 25],
            backgroundColor: [
                'rgba(239, 68, 68, 0.9)',
                'rgba(245, 158, 11, 0.9)',
                'rgba(59, 130, 246, 0.9)',
                'rgba(16, 185, 129, 0.9)',
            ],
            borderWidth: 0,
        }],
    };

    // Monthly Trend Area Chart
    const monthlyTrendData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                label: 'Reported',
                data: [120, 190, 150, 180, 140, 165],
                borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Resolved',
                data: [100, 170, 140, 160, 130, 155],
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                fill: true,
                tension: 0.4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: 'rgba(156, 163, 175, 0.8)' },
            },
            y: {
                grid: { color: 'rgba(156, 163, 175, 0.1)' },
                ticks: { color: 'rgba(156, 163, 175, 0.8)' },
            },
        },
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: 'rgba(156, 163, 175, 0.9)',
                    padding: 15,
                    usePointStyle: true,
                },
            },
        },
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ height: 400 }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">State Dashboard</h1>
                    <p className="page-subtitle">Overview of all Local Authorities and Incidents</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/authorities/new')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{ marginRight: '0.5rem' }}>
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add Authority
                </button>
            </div>

            {/* Stats Overview - 2 rows of 4 cards */}
            <div className="stats-grid">
                <div className="card stat-card">
                    <div className="stat-icon stat-icon-primary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 21h18M3 7v14M21 7v14M6 7v.01M12 7v.01M18 7v.01M6 3h12l3 4H3l3-4z" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Local Authorities</div>
                        <div className="stat-value">{formatNumber(stats.totalLAs)}</div>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon stat-icon-warning">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            <path d="M12 9v4M12 17h.01" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Total Incidents</div>
                        <div className="stat-value">{formatNumber(stats.totalIncidents)}</div>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon stat-icon-danger">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Today's Incidents</div>
                        <div className="stat-value">{formatNumber(stats.todayIncidents)}</div>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon stat-icon-success">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                            <path d="M22 4L12 14.01l-3-3" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Resolution Rate</div>
                        <div className="stat-value">{stats.resolvedRate}%</div>
                    </div>
                </div>
            </div>

            {/* Secondary Stats Row */}
            <div className="stats-grid" style={{ marginTop: 'var(--spacing-lg)' }}>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'rgb(139, 92, 246)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Total Staff</div>
                        <div className="stat-value">{formatNumber(stats.totalEmployees || 156)}</div>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', color: 'rgb(236, 72, 153)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 8v4l3 3" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Avg Response</div>
                        <div className="stat-value">{stats.avgResponseTime || 12} min</div>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)', color: 'rgb(20, 184, 166)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Active Districts</div>
                        <div className="stat-value">{new Set(localAuthorities.map(la => la.district)).size || 4}</div>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'rgba(251, 146, 60, 0.1)', color: 'rgb(251, 146, 60)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 01-3.46 0" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Pending Alerts</div>
                        <div className="stat-value">{stats.pendingIncidents || 8}</div>
                    </div>
                </div>
            </div>

            {/* Map Section */}
            <div style={{ marginTop: 'var(--spacing-xl)', marginBottom: 'var(--spacing-xl)' }}>
                <div className="card">
                    <div className="card-header" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                        <h3 className="card-title">Live Incident Heatmap</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Real-time district-wise incident reporting</p>
                    </div>
                    <IncidentMap />
                </div>
            </div>

            {/* Charts Row 1 - Weekly Trend & LA Comparison */}
            <div className="dashboard-grid">
                <div className="dashboard-col-6">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Weekly Incident Trend</h3>
                        </div>
                        <div className="chart-container">
                            <Line data={incidentTrendData} options={chartOptions} />
                        </div>
                    </div>
                </div>
                <div className="dashboard-col-6">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">LA Performance</h3>
                        </div>
                        <div className="chart-container">
                            <Bar data={laComparisonData} options={chartOptions} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 - Status & Severity */}
            <div className="dashboard-grid" style={{ marginTop: 'var(--spacing-xl)' }}>
                <div className="dashboard-col-6">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Incident Status</h3>
                        </div>
                        <div className="chart-container">
                            <Doughnut data={incidentStatusData} options={doughnutOptions} />
                        </div>
                    </div>
                </div>
                <div className="dashboard-col-6">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Severity Distribution</h3>
                        </div>
                        <div className="chart-container">
                            <Pie data={incidentSeverityData} options={doughnutOptions} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 3 - Monthly Trend */}
            <div style={{ marginTop: 'var(--spacing-xl)' }}>
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Monthly Trend - Reported vs Resolved</h3>
                    </div>
                    <div className="chart-container" style={{ height: '300px' }}>
                        <Line data={monthlyTrendData} options={{
                            ...chartOptions,
                            plugins: {
                                legend: {
                                    display: true,
                                    position: 'top',
                                    labels: { color: 'rgba(156, 163, 175, 0.9)' },
                                },
                            },
                        }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
