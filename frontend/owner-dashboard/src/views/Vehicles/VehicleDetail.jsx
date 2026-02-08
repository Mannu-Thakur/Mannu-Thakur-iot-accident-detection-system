/**
 * Vehicle Detail Page for Owner
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ownerService from '../../services/owner.service.js';
import { formatDateTime, formatStatus } from '../../../../shared/utils/formatters.js';

function VehicleDetail() {
    const { vehicleId } = useParams();
    const navigate = useNavigate();
    const [vehicle, setVehicle] = useState(null);
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [vehicleId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [vehicleData, incidentData] = await Promise.all([
                ownerService.getVehicleDetails(vehicleId),
                ownerService.getVehicleIncidents(vehicleId),
            ]);
            setVehicle(vehicleData);
            setIncidents(incidentData);
        } catch (error) {
            console.error('Failed to load vehicle:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ height: 400 }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    if (!vehicle) {
        return (
            <div className="card">
                <div className="empty-state">
                    <h4 className="empty-state-title">Vehicle not found</h4>
                    <button className="btn btn-primary" onClick={() => navigate('/vehicles')}>Back to Vehicles</button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <button className="btn btn-ghost" onClick={() => navigate('/vehicles')}>← Back</button>
                    <h1 className="page-title" style={{ marginTop: 'var(--spacing-sm)' }}>{vehicle.registrationNo}</h1>
                </div>
                <span className="vehicle-type">{vehicle.vehicleType}</span>
            </div>

            {/* Vehicle Info */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div className="card-header">
                    <h3 className="card-title">Vehicle Details</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-lg)' }}>
                    <div>
                        <label className="text-muted text-sm">Registration Number</label>
                        <p className="font-medium">{vehicle.registrationNo}</p>
                    </div>
                    <div>
                        <label className="text-muted text-sm">Chassis Number</label>
                        <p className="font-medium">{vehicle.chassisNo || '-'}</p>
                    </div>
                    <div>
                        <label className="text-muted text-sm">Device Status</label>
                        <p className="font-medium">{vehicle.deviceId ? 'Active' : 'No device bound'}</p>
                    </div>
                    <div>
                        <label className="text-muted text-sm">Device ID</label>
                        <p className="font-medium">{vehicle.deviceId || '-'}</p>
                    </div>
                </div>
            </div>

            {/* Incident History */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Incident History</h3>
                </div>

                {incidents.length === 0 ? (
                    <div className="empty-state">
                        <h4 className="empty-state-title">No incidents</h4>
                        <p className="empty-state-text">This vehicle has no incident records.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Incident ID</th>
                                    <th>Date</th>
                                    <th>Severity</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incidents.map(inc => (
                                    <tr key={inc.incidentId}>
                                        <td className="font-medium">{inc.incidentId}</td>
                                        <td>{formatDateTime(inc.timestamp?.serverTimestamp)}</td>
                                        <td>
                                            <span className={`badge badge-${getSeverityBadge(inc.severityLevel)}`}>
                                                Level {inc.severityLevel}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${getStatusBadge(inc.status)}`}>
                                                {formatStatus(inc.status)}
                                            </span>
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

function getSeverityBadge(level) {
    if (level >= 4) return 'danger';
    if (level >= 3) return 'warning';
    return 'primary';
}

function getStatusBadge(status) {
    const map = { REPORTED: 'warning', RESOLVED: 'success', FALSE_ALARM: 'gray' };
    return map[status] || 'primary';
}

export default VehicleDetail;
