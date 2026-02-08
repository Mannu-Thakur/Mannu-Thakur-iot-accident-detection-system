/**
 * RTO Dashboard Page
 * Advanced dashboard with charts and comprehensive statistics
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
import rtoService from '../../services/rto.service.js';
import { formatNumber } from '@shared/utils/formatters.js';

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
        totalVehicles: 0,
        totalOwners: 0,
        totalDevices: 0,
        totalIncidents: 0,
        deviceBindingRate: 0,
        vehicleTypeDistribution: [],
        monthlyRegistrations: [],
        incidentSeverity: [],
        recentActivity: { registrations: 0, transfers: 0 }
    });
    const [recentVehicles, setRecentVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            console.log('[Dashboard] Loading data...');

            const [statsData, vehiclesRes] = await Promise.all([
                rtoService.getStatistics().catch(err => {
                    console.error('[Dashboard] Failed to load statistics:', err);
                    return null;
                }),
                rtoService.getVehicles({ limit: 5 }).catch(err => {
                    console.error('[Dashboard] Failed to load vehicles:', err);
                    return { data: [] };
                }),
            ]);

            console.log('[Dashboard] Stats data received:', statsData);
            console.log('[Dashboard] Vehicles response:', vehiclesRes);

            if (statsData) {
                setStats(statsData);
            }
            // Handle both { data: [...] } and direct array responses
            const vehicles = vehiclesRes?.data || vehiclesRes || [];
            setRecentVehicles(Array.isArray(vehicles) ? vehicles : []);

            console.log('[Dashboard] Data loaded. Stats:', statsData, 'Vehicles:', vehicles);
        } catch (error) {
            console.error('[Dashboard] Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    // Monthly Registration Trend Chart
    const monthlyTrendData = {
        labels: stats.monthlyRegistrations?.length > 0
            ? stats.monthlyRegistrations.map(m => {
                const [year, month] = m.month.split('-');
                return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short' });
            })
            : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
            label: 'Registrations',
            data: stats.monthlyRegistrations?.length > 0
                ? stats.monthlyRegistrations.map(m => m.count)
                : [12, 19, 15, 25, 22, 30],
            borderColor: 'rgba(59, 130, 246, 1)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: 'rgba(59, 130, 246, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
        }],
    };

    // Vehicle Type Distribution Chart
    const vehicleTypeData = {
        labels: stats.vehicleTypeDistribution?.length > 0
            ? stats.vehicleTypeDistribution.map(v => v.type)
            : ['CAR', 'MOTORCYCLE', 'TRUCK', 'BUS', 'AUTO'],
        datasets: [{
            data: stats.vehicleTypeDistribution?.length > 0
                ? stats.vehicleTypeDistribution.map(v => v.count)
                : [45, 30, 12, 8, 5],
            backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(139, 92, 246, 0.8)',
                'rgba(236, 72, 153, 0.8)',
            ],
            borderWidth: 0,
            cutout: '65%',
        }],
    };

    // Incident Severity Pie Chart
    const incidentSeverityData = {
        labels: stats.incidentSeverity?.length > 0
            ? stats.incidentSeverity.map(s => s.severity)
            : ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
            data: stats.incidentSeverity?.length > 0
                ? stats.incidentSeverity.map(s => s.count)
                : [5, 15, 35, 45],
            backgroundColor: [
                'rgba(239, 68, 68, 0.9)',
                'rgba(245, 158, 11, 0.9)',
                'rgba(59, 130, 246, 0.9)',
                'rgba(16, 185, 129, 0.9)',
            ],
            borderWidth: 0,
        }],
    };

    // Device Binding Bar Chart
    const deviceBindingData = {
        labels: ['With Device', 'Without Device'],
        datasets: [{
            data: [stats.totalDevices, Math.max(0, stats.totalVehicles - stats.totalDevices)],
            backgroundColor: [
                'rgba(16, 185, 129, 0.8)',
                'rgba(156, 163, 175, 0.5)',
            ],
            borderRadius: 8,
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
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
                    <h1 className="page-title">RTO Dashboard</h1>
                    <p className="page-subtitle">Vehicle registry analytics and management</p>
                </div>
                <div className="flex gap-md">
                    <button className="btn btn-secondary" onClick={() => navigate('/owners/new')}>
                        + New Owner
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate('/vehicles/new')}>
                        + Register Vehicle
                    </button>
                </div>
            </div>

            {/* Primary Stats Grid */}
            <div className="stats-grid">
                <div className="card stat-card">
                    <div className="stat-icon stat-icon-primary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="1" y="6" width="22" height="12" rx="2" />
                            <circle cx="6" cy="12" r="2" />
                            <circle cx="18" cy="12" r="2" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Total Vehicles</div>
                        <div className="stat-value">{formatNumber(stats.totalVehicles)}</div>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon stat-icon-success">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Registered Owners</div>
                        <div className="stat-value">{formatNumber(stats.totalOwners)}</div>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon stat-icon-warning">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="4" y="4" width="16" height="16" rx="2" />
                            <path d="M9 9h6v6H9z" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Active Devices</div>
                        <div className="stat-value">{formatNumber(stats.totalDevices)}</div>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon stat-icon-danger">
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
            </div>

            {/* Secondary Stats Row */}
            <div className="stats-grid" style={{ marginTop: 'var(--spacing-lg)' }}>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'rgb(139, 92, 246)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                            <path d="M22 4L12 14.01l-3-3" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Device Binding Rate</div>
                        <div className="stat-value">{stats.deviceBindingRate}%</div>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', color: 'rgb(236, 72, 153)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7l2-7z" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">New This Week</div>
                        <div className="stat-value">{stats.recentActivity?.registrations || 0}</div>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)', color: 'rgb(20, 184, 166)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Transfers This Week</div>
                        <div className="stat-value">{stats.recentActivity?.transfers || 0}</div>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'rgba(251, 146, 60, 0.1)', color: 'rgb(251, 146, 60)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Avg Vehicles/Owner</div>
                        <div className="stat-value">
                            {stats.totalOwners > 0 ? (stats.totalVehicles / stats.totalOwners).toFixed(1) : '0'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="dashboard-grid" style={{ marginTop: 'var(--spacing-xl)' }}>
                <div className="dashboard-col-6">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Registration Trends</h3>
                        </div>
                        <div className="chart-container">
                            <Line data={monthlyTrendData} options={chartOptions} />
                        </div>
                    </div>
                </div>
                <div className="dashboard-col-6">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Vehicle Type Distribution</h3>
                        </div>
                        <div className="chart-container">
                            <Doughnut data={vehicleTypeData} options={doughnutOptions} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="dashboard-grid" style={{ marginTop: 'var(--spacing-xl)' }}>
                <div className="dashboard-col-6">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Incident Severity</h3>
                        </div>
                        <div className="chart-container">
                            <Pie data={incidentSeverityData} options={doughnutOptions} />
                        </div>
                    </div>
                </div>
                <div className="dashboard-col-6">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Device Binding Status</h3>
                        </div>
                        <div className="chart-container">
                            <Bar data={deviceBindingData} options={{
                                ...chartOptions,
                                indexAxis: 'y',
                            }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Vehicles Table */}
            <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
                <div className="card-header">
                    <h3 className="card-title">Recent Registrations</h3>
                    <button className="btn btn-ghost" onClick={() => navigate('/vehicles')}>
                        View All →
                    </button>
                </div>

                {recentVehicles.length === 0 ? (
                    <div className="empty-state">
                        <h4 className="empty-state-title">No vehicles registered yet</h4>
                        <p className="empty-state-text">Register your first vehicle to get started.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Registration No</th>
                                    <th>Type</th>
                                    <th>Model</th>
                                    <th>Device</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentVehicles.map(v => (
                                    <tr key={v.vehicleId} style={{ cursor: 'pointer' }}>
                                        <td className="font-medium">{v.registrationNo}</td>
                                        <td><span className="vehicle-type-badge">{v.vehicleType}</span></td>
                                        <td className="text-muted">{v.model || '-'}</td>
                                        <td>
                                            {v.deviceId ? (
                                                <span className="badge badge-success">Bound</span>
                                            ) : (
                                                <span className="badge badge-gray">None</span>
                                            )}
                                        </td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/vehicles/${v.vehicleId}`)}>
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
