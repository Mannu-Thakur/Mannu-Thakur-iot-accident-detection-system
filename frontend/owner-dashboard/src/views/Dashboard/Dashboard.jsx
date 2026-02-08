/**
 * Owner Dashboard Page
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ownerService from '../../services/owner.service.js';
import { formatNumber } from '../../../../shared/utils/formatters.js';

function Dashboard() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const data = await ownerService.getMyVehicles();
            setVehicles(data);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalIncidents = vehicles.reduce((sum, v) => sum + (v.incidentCount || 0), 0);

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
                    <h1 className="page-title">My Dashboard</h1>
                    <p className="page-subtitle">Overview of your vehicles</p>
                </div>
            </div>

            {/* Stats */}
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
                        <div className="stat-label">My Vehicles</div>
                        <div className="stat-value">{formatNumber(vehicles.length)}</div>
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
                        <div className="stat-value">{formatNumber(totalIncidents)}</div>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon stat-icon-success">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="4" y="4" width="16" height="16" rx="2" />
                            <path d="M9 9h6v6H9z" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Active Devices</div>
                        <div className="stat-value">{vehicles.filter(v => v.deviceId).length}</div>
                    </div>
                </div>
            </div>

            {/* Vehicle Cards */}
            <h2 style={{ marginBottom: 'var(--spacing-md)' }}>My Vehicles</h2>
            {vehicles.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <h4 className="empty-state-title">No vehicles</h4>
                        <p className="empty-state-text">You don't have any vehicles registered yet.</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-lg)' }}>
                    {vehicles.map(v => (
                        <div
                            key={v.vehicleId}
                            className="card vehicle-card"
                            onClick={() => navigate(`/vehicles/${v.vehicleId}`)}
                        >
                            <div className="vehicle-card-header">
                                <span className="vehicle-reg">{v.registrationNo}</span>
                                <span className="vehicle-type">{v.vehicleType}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <span className="text-muted text-sm">Device</span>
                                    <p className="font-medium">{v.deviceId ? 'Active' : 'None'}</p>
                                </div>
                                <div>
                                    <span className="text-muted text-sm">Incidents</span>
                                    <p className="font-medium">{v.incidentCount || 0}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Dashboard;
