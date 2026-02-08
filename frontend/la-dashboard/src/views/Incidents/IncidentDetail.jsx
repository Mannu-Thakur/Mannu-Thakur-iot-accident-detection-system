/**
 * Incident Detail Page
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import incidentService from '../../services/incident.service.js';
import { formatDateTime, formatStatus, formatSeverity, getSeverityColor } from '../../../../shared/utils/formatters.js';

function IncidentDetail() {
    const { incidentId } = useParams();
    const navigate = useNavigate();
    const [incident, setIncident] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadIncident();
    }, [incidentId]);

    const loadIncident = async () => {
        try {
            setLoading(true);
            const data = await incidentService.getIncidentDetails(incidentId);
            setIncident(data);
        } catch (error) {
            console.error('Failed to load incident:', error);
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

    if (!incident) {
        return (
            <div className="card">
                <div className="empty-state">
                    <h4 className="empty-state-title">Incident not found</h4>
                    <p className="empty-state-text">The incident you're looking for doesn't exist.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/incidents')}>
                        Back to Incidents
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <button className="btn btn-ghost" onClick={() => navigate('/incidents')}>
                        ← Back
                    </button>
                    <h1 className="page-title" style={{ marginTop: 'var(--spacing-sm)' }}>
                        {incident.incidentId}
                    </h1>
                </div>
                <span className={`badge badge-${getStatusBadge(incident.status)}`} style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                    {formatStatus(incident.status)}
                </span>
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-col-8">
                    {/* Incident Info */}
                    <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <div className="card-header">
                            <h3 className="card-title">Incident Details</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-lg)' }}>
                            <div>
                                <label className="text-muted text-sm">Severity</label>
                                <p className="font-medium">
                                    <span className={`badge badge-${getSeverityColor(incident.severityLevel)}`}>
                                        Level {incident.severityLevel} - {formatSeverity(incident.severityLevel)}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <label className="text-muted text-sm">Reported At</label>
                                <p className="font-medium">{formatDateTime(incident.timestamp?.serverTimestamp)}</p>
                            </div>
                            <div>
                                <label className="text-muted text-sm">Vehicle</label>
                                <p className="font-medium">{incident.vehicle?.registrationNo || incident.vehicleId}</p>
                            </div>
                            <div>
                                <label className="text-muted text-sm">Device</label>
                                <p className="font-medium">{incident.deviceId || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* AI Analysis */}
                    {incident.aiFields && (
                        <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <div className="card-header">
                                <h3 className="card-title">AI Analysis</h3>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <label className="text-muted text-sm">Fire Detected</label>
                                    <p className="font-medium">{incident.aiFields.aiFireDetected ? 'Yes' : 'No'}</p>
                                </div>
                                <div>
                                    <label className="text-muted text-sm">Water Submerged</label>
                                    <p className="font-medium">{incident.aiFields.aiWaterSubmerged ? 'Yes' : 'No'}</p>
                                </div>
                                <div>
                                    <label className="text-muted text-sm">Patient Condition</label>
                                    <p className="font-medium">{incident.aiFields.aiPatientCondition || 'Unknown'}</p>
                                </div>
                                {incident.aiFields.aiConfidenceScore && (
                                    <div>
                                        <label className="text-muted text-sm">Confidence</label>
                                        <p className="font-medium">{(incident.aiFields.aiConfidenceScore * 100).toFixed(1)}%</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Location */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Location</h3>
                        </div>
                        <p>{incident.address || 'Address not available'}</p>
                        {incident.location?.coordinates && (
                            <p className="text-muted text-sm" style={{ marginTop: 'var(--spacing-sm)' }}>
                                Coordinates: {incident.location.coordinates[1]}, {incident.location.coordinates[0]}
                            </p>
                        )}
                    </div>
                </div>

                <div className="dashboard-col-4">
                    {/* Sensor Data */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Sensor Data</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {incident.sensorData?.accelerometer && (
                                <div>
                                    <label className="text-muted text-sm">Accelerometer</label>
                                    <p className="text-sm font-mono">
                                        X: {incident.sensorData.accelerometer.x?.toFixed(2)} |
                                        Y: {incident.sensorData.accelerometer.y?.toFixed(2)} |
                                        Z: {incident.sensorData.accelerometer.z?.toFixed(2)}
                                    </p>
                                </div>
                            )}
                            {incident.sensorData?.gyroscope && (
                                <div>
                                    <label className="text-muted text-sm">Gyroscope</label>
                                    <p className="text-sm font-mono">
                                        X: {incident.sensorData.gyroscope.x?.toFixed(2)} |
                                        Y: {incident.sensorData.gyroscope.y?.toFixed(2)} |
                                        Z: {incident.sensorData.gyroscope.z?.toFixed(2)}
                                    </p>
                                </div>
                            )}
                            {incident.sensorData?.impactForce && (
                                <div>
                                    <label className="text-muted text-sm">Impact Force</label>
                                    <p className="font-medium">{incident.sensorData.impactForce?.toFixed(2)} G</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function getStatusBadge(status) {
    const map = {
        REPORTED: 'warning',
        AI_PROCESSING: 'primary',
        VERIFIED: 'primary',
        DISPATCHED: 'primary',
        RESOLVED: 'success',
        FALSE_ALARM: 'gray',
    };
    return map[status] || 'gray';
}

export default IncidentDetail;
