/**
 * Incident Detail Page
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import incidentService from '../../services/incident.service.js';
import { formatDateTime, formatStatus, formatSeverity, getSeverityColor } from '../../../../shared/utils/formatters.js';
import AssignTeamModal from './AssignTeamModal.jsx';
import { useToast } from '../../../../shared/hooks/useToast.jsx';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function IncidentDetail() {
    const { incidentId } = useParams();
    const navigate = useNavigate();
    const [incident, setIncident] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showLiveAccessModal, setShowLiveAccessModal] = useState(false);
    const [requestReason, setRequestReason] = useState('Verify incident severity');
    const [requestingAccess, setRequestingAccess] = useState(false);
    const [modalClosing, setModalClosing] = useState(false);
    const { success, error } = useToast();

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

    const closeModal = (setModalFn) => {
        setModalClosing(true);
        setTimeout(() => {
            setModalFn(false);
            setModalClosing(false);
        }, 300);
    };

    const handleRequestLiveAccess = async () => {
        try {
            setRequestingAccess(true);
            await incidentService.requestLiveAccess({
                incidentId: incident.incidentId,
                reason: requestReason
            });
            success('Live access requested sent to device/owner');
            closeModal(setShowLiveAccessModal);
            loadIncident(); // Refresh to see request status
        } catch (err) {
            error(err.message || 'Failed to request live access');
        } finally {
            setRequestingAccess(false);
        }
    };

    const isLiveAccessPending = incident?.liveAccessRequest?.status === 'PENDING';
    const isLiveAccessGranted = incident?.liveAccessRequest?.status === 'GRANTED';

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

            {/* Actions Bar */}
            <div className="card mb-6 flex justify-between items-center" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div className="flex gap-md">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowAssignModal(true)}
                        disabled={incident.status === 'RESOLVED' || incident.status === 'ARCHIVED'}
                    >
                        {incident.rescueTask ? 'View Rescue Task' : 'Assign Rescue Team'}
                    </button>
                    {!isLiveAccessGranted && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowLiveAccessModal(true)}
                            disabled={isLiveAccessPending}
                        >
                            {isLiveAccessPending ? 'Request Pending...' : 'Request Live Access'}
                        </button>
                    )}
                </div>
                {isLiveAccessGranted && (
                    <div className="flex items-center gap-sm text-success">
                        <span className="live-indicator">●</span> Live Access Granted
                    </div>
                )}
            </div>

            {/* Live Access Player (Placeholder) */}
            {isLiveAccessGranted && (
                <div className="card mb-6" style={{ marginBottom: 'var(--spacing-lg)', background: '#000', color: '#fff', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="text-center">
                        <h3>Live Stream Active</h3>
                        <p>Stream Token: {incident.liveAccessRequest.streamToken}</p>
                        <p className="text-sm text-muted">WebRTC Player Placeholder</p>
                    </div>
                </div>
            )}

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

                    {/* Nominee Details (Privacy Protected) */}
                    <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <div className="card-header">
                            <h3 className="card-title">Emergency Contacts</h3>
                        </div>
                        {incident.ownerSnapshot?.nominees && incident.ownerSnapshot.nominees.length > 0 ? (
                            <div className="table-responsive">
                                <table className="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Relation</th>
                                            <th>Phone</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {incident.ownerSnapshot.nominees.map((nominee, idx) => (
                                            <tr key={idx}>
                                                <td>{nominee.name}</td>
                                                <td>{nominee.relationship || 'Nominee'}</td>
                                                <td>{nominee.phone}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {['RESOLVED', 'ARCHIVED'].includes(incident.status) && (
                                    <p className="text-xs text-muted mt-2">
                                        * Contact details masked for privacy after resolution.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="text-muted">No nominee details available.</p>
                        )}
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
                    {/* Map */}
                    <div className="card" style={{ marginBottom: 'var(--spacing-lg)', padding: 0, overflow: 'hidden', height: '300px' }}>
                        {incident.location?.coordinates ? (
                            <MapContainer
                                center={[incident.location.coordinates[1], incident.location.coordinates[0]]}
                                zoom={15}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; OpenStreetMap contributors'
                                />
                                <Marker position={[incident.location.coordinates[1], incident.location.coordinates[0]]}>
                                    <Popup>
                                        Incident Location<br />
                                        {incident.address}
                                    </Popup>
                                </Marker>
                            </MapContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-muted">Location data unavailable</p>
                            </div>
                        )}
                    </div>

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

            {/* Assign Team Modal */}
            <AssignTeamModal
                isOpen={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                incidentId={incidentId}
                onSuccess={loadIncident}
            />

            {/* Live Access Request Modal - Glassmorphism style */}
            {showLiveAccessModal && (
                <div
                    className={`modal-overlay ${modalClosing ? 'closing' : ''}`}
                    onClick={() => closeModal(setShowLiveAccessModal)}
                >
                    <div
                        className="modal-content glass-panel bounce-in"
                        style={{ maxWidth: '400px' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3 className="modal-title">Request Live Access</h3>
                            <button className="btn-close" onClick={() => closeModal(setShowLiveAccessModal)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p className="mb-4">
                                Requesting live camera access from the vehicle owner/device.
                                The owner will be notified to approve the request.
                            </p>
                            <div className="form-group">
                                <label className="form-label">Reason</label>
                                <textarea
                                    className="form-input"
                                    rows="2"
                                    value={requestReason}
                                    onChange={(e) => setRequestReason(e.target.value)}
                                ></textarea>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => closeModal(setShowLiveAccessModal)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleRequestLiveAccess} disabled={requestingAccess}>
                                {requestingAccess ? <span className="spinner"></span> : 'Send Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
