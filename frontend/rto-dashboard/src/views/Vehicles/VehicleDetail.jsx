/**
 * Vehicle Detail Page
 * Comprehensive vehicle view with incidents, transfers, and device management
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import rtoService from '../../services/rto.service.js';
import { useToast } from '@shared/hooks/useToast.jsx';
import { formatDate } from '@shared/utils/formatters.js';

function VehicleDetail() {
    const { vehicleId } = useParams();
    const navigate = useNavigate();
    const { success, error } = useToast();

    const [vehicle, setVehicle] = useState(null);
    const [incidents, setIncidents] = useState({ stats: {}, incidents: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('details');

    // Modal states
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showReplaceDeviceModal, setShowReplaceDeviceModal] = useState(false);
    const [modalClosing, setModalClosing] = useState(false);

    // Form states
    const [transferData, setTransferData] = useState({ newOwnerId: '', reason: '' });
    const [replaceDeviceData, setReplaceDeviceData] = useState({ newDeviceId: '', reason: 'FAULTY', notes: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadVehicleData();
    }, [vehicleId]);

    const loadVehicleData = async () => {
        try {
            setLoading(true);
            const [vehicleData, incidentData] = await Promise.all([
                rtoService.getVehicle(vehicleId),
                rtoService.getVehicleIncidents(vehicleId).catch(() => ({ stats: {}, incidents: [] }))
            ]);
            setVehicle(vehicleData);
            setIncidents(incidentData);
        } catch (err) {
            error('Failed to load vehicle details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const closeModal = (setModalFn) => {
        setModalClosing(true);
        setTimeout(() => {
            setModalFn(false);
            setModalClosing(false);
        }, 350);
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await rtoService.transferOwnership(vehicleId, transferData);
            success('Ownership transferred successfully');
            closeModal(setShowTransferModal);
            loadVehicleData();
        } catch (err) {
            error(err.message || 'Failed to transfer ownership');
            // Close modal after short delay so user can see the error notification
            setTimeout(() => closeModal(setShowTransferModal), 1500);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReplaceDevice = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await rtoService.replaceDevice({
                vehicleId,
                oldDeviceId: vehicle.deviceId,
                ...replaceDeviceData
            });
            success('Device replaced successfully');
            closeModal(setShowReplaceDeviceModal);
            loadVehicleData();
        } catch (err) {
            error(err.message || 'Failed to replace device');
            // Close modal after short delay so user can see the error notification
            setTimeout(() => closeModal(setShowReplaceDeviceModal), 1500);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            await rtoService.deleteVehicle(vehicleId);
            success('Vehicle deregistered successfully');
            navigate('/vehicles');
        } catch (err) {
            error(err.message || 'Failed to delete vehicle');
            // Close modal after short delay so user can see the error notification
            setTimeout(() => closeModal(setShowDeleteModal), 1500);
        } finally {
            setSubmitting(false);
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
            <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                <h3>Vehicle not found</h3>
                <button className="btn btn-primary" onClick={() => navigate('/vehicles')} style={{ marginTop: 'var(--spacing-md)' }}>
                    Back to Vehicles
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <button className="btn btn-ghost" onClick={() => navigate('/vehicles')} style={{ marginBottom: 'var(--spacing-sm)' }}>
                        ← Back to Vehicles
                    </button>
                    <h1 className="page-title">{vehicle.registrationNo}</h1>
                    <p className="page-subtitle">{vehicle.manufacturer} {vehicle.model} • {vehicle.vehicleType}</p>
                </div>
                <div className="action-group">
                    <button className="btn btn-secondary" onClick={() => navigate(`/vehicles/${vehicleId}/edit`)}>
                        Edit
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowTransferModal(true)}>
                        Transfer Ownership
                    </button>
                    {vehicle.deviceId && (
                        <button className="btn btn-warning" onClick={() => setShowReplaceDeviceModal(true)}>
                            Replace Device
                        </button>
                    )}
                    <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>
                        Deregister
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>
                    Details
                </button>
                <button className={`tab ${activeTab === 'incidents' ? 'active' : ''}`} onClick={() => setActiveTab('incidents')}>
                    Incidents ({incidents.stats?.total || 0})
                </button>
                <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                    Ownership History
                </button>
            </div>

            {/* Details Tab */}
            {activeTab === 'details' && (
                <div className="detail-grid">
                    <div>
                        {/* Vehicle Information */}
                        <div className="card">
                            <div className="detail-section">
                                <h3 className="detail-section-title">Vehicle Information</h3>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <div className="info-label">Registration No</div>
                                        <div className="info-value">{vehicle.registrationNo}</div>
                                    </div>
                                    <div className="info-item">
                                        <div className="info-label">Chassis No</div>
                                        <div className="info-value">{vehicle.chassisNo}</div>
                                    </div>
                                    <div className="info-item">
                                        <div className="info-label">Engine No</div>
                                        <div className="info-value">{vehicle.engineNo || '-'}</div>
                                    </div>
                                    <div className="info-item">
                                        <div className="info-label">Vehicle Type</div>
                                        <div className="info-value">{vehicle.vehicleType}</div>
                                    </div>
                                    <div className="info-item">
                                        <div className="info-label">Fuel Type</div>
                                        <div className="info-value">{vehicle.fuelType || '-'}</div>
                                    </div>
                                    <div className="info-item">
                                        <div className="info-label">Color</div>
                                        <div className="info-value">{vehicle.color || '-'}</div>
                                    </div>
                                    <div className="info-item">
                                        <div className="info-label">Manufacturer</div>
                                        <div className="info-value">{vehicle.manufacturer || '-'}</div>
                                    </div>
                                    <div className="info-item">
                                        <div className="info-label">Model</div>
                                        <div className="info-value">{vehicle.model || '-'}</div>
                                    </div>
                                    <div className="info-item">
                                        <div className="info-label">Manufacturing Year</div>
                                        <div className="info-value">{vehicle.manufacturingYear || '-'}</div>
                                    </div>
                                    <div className="info-item">
                                        <div className="info-label">Seating Capacity</div>
                                        <div className="info-value">{vehicle.seatingCapacity || '-'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h3 className="detail-section-title">Registration</h3>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <div className="info-label">Registration Date</div>
                                        <div className="info-value">{vehicle.registrationDate ? formatDate(vehicle.registrationDate) : '-'}</div>
                                    </div>
                                    <div className="info-item">
                                        <div className="info-label">Expiry Date</div>
                                        <div className="info-value">{vehicle.registrationExpiryDate ? formatDate(vehicle.registrationExpiryDate) : '-'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h3 className="detail-section-title">Insurance</h3>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <div className="info-label">Provider</div>
                                        <div className="info-value">{vehicle.insuranceProvider || '-'}</div>
                                    </div>
                                    <div className="info-item">
                                        <div className="info-label">Policy No</div>
                                        <div className="info-value">{vehicle.insurancePolicyNo || '-'}</div>
                                    </div>
                                    <div className="info-item">
                                        <div className="info-label">Expiry Date</div>
                                        <div className="info-value">{vehicle.insuranceExpiryDate ? formatDate(vehicle.insuranceExpiryDate) : '-'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        {/* Owner Card */}
                        <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <h3 className="detail-section-title">Current Owner</h3>
                            {vehicle.owner ? (
                                <div>
                                    <div className="info-value" style={{ fontSize: '1.125rem', marginBottom: 'var(--spacing-sm)' }}>
                                        {vehicle.owner.fullName}
                                    </div>
                                    <div className="info-label">{vehicle.owner.mobileNumber}</div>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        style={{ marginTop: 'var(--spacing-md)' }}
                                        onClick={() => navigate(`/owners/${vehicle.currentOwnerId}`)}
                                    >
                                        View Owner →
                                    </button>
                                </div>
                            ) : (
                                <div className="text-muted">No owner information</div>
                            )}
                        </div>

                        {/* Device Card */}
                        <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <h3 className="detail-section-title">Device Status</h3>
                            {vehicle.device ? (
                                <div>
                                    <div className="status-indicator" style={{ marginBottom: 'var(--spacing-sm)' }}>
                                        <span className={`status-dot ${vehicle.device.isOnline ? 'online' : 'offline'}`}></span>
                                        <span>{vehicle.device.isOnline ? 'Online' : 'Offline'}</span>
                                    </div>
                                    <div className="info-item">
                                        <div className="info-label">Device ID</div>
                                        <div className="info-value">{vehicle.device.deviceId}</div>
                                    </div>
                                    <div className="info-item">
                                        <div className="info-label">Status</div>
                                        <div className="info-value">{vehicle.device.lifecycleStatus}</div>
                                    </div>
                                    <div className="info-item">
                                        <div className="info-label">Camera</div>
                                        <div className="info-value">{vehicle.device.camEnabled ? 'Enabled' : 'Disabled'}</div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>No device bound</div>
                                    <button className="btn btn-primary btn-sm">Bind Device</button>
                                </div>
                            )}
                        </div>

                        {/* Incident Summary */}
                        <div className="card">
                            <h3 className="detail-section-title">Incident Summary</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)', textAlign: 'center' }}>
                                <div>
                                    <div className="stat-value">{incidents.stats?.total || 0}</div>
                                    <div className="info-label">Total</div>
                                </div>
                                <div>
                                    <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{incidents.stats?.critical || 0}</div>
                                    <div className="info-label">Critical</div>
                                </div>
                                <div>
                                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>{incidents.stats?.resolved || 0}</div>
                                    <div className="info-label">Resolved</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Incidents Tab */}
            {activeTab === 'incidents' && (
                <div className="card">
                    {incidents.incidents?.length === 0 ? (
                        <div className="empty-state">
                            <h4 className="empty-state-title">No incidents recorded</h4>
                            <p className="empty-state-text">This vehicle has no incident history.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Incident ID</th>
                                        <th>Severity</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Location</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {incidents.incidents?.map(inc => (
                                        <tr key={inc.incidentId}>
                                            <td className="font-medium">{inc.incidentId}</td>
                                            <td>
                                                <span className={`badge ${inc.severityLevel >= 4 ? 'badge-danger' : inc.severityLevel >= 3 ? 'badge-warning' : 'badge-gray'}`}>
                                                    Level {inc.severityLevel}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${inc.status === 'RESOLVED' ? 'badge-success' : 'badge-warning'}`}>
                                                    {inc.status}
                                                </span>
                                            </td>
                                            <td className="text-muted">{formatDate(inc.timestamp?.serverTimestamp)}</td>
                                            <td className="text-muted">
                                                {inc.location?.coordinates ? `${inc.location.coordinates[1]?.toFixed(4)}, ${inc.location.coordinates[0]?.toFixed(4)}` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="card">
                    {!vehicle.ownershipHistory?.length ? (
                        <div className="empty-state">
                            <h4 className="empty-state-title">No ownership transfers</h4>
                            <p className="empty-state-text">This vehicle has had only one owner.</p>
                        </div>
                    ) : (
                        <div className="timeline">
                            {vehicle.ownershipHistory?.map((entry, i) => (
                                <div key={i} className="timeline-item">
                                    <div className="timeline-date">{formatDate(entry.transferDate)}</div>
                                    <div className="timeline-content">
                                        Transferred from <strong>{entry.previousOwnerName || entry.previousOwnerId}</strong>
                                        {entry.reason && <span className="text-muted"> — {entry.reason}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Transfer Modal */}
            {showTransferModal && (
                <div className={`modal-overlay ${modalClosing ? 'closing' : ''}`} onClick={() => closeModal(setShowTransferModal)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Transfer Ownership</h3>
                        </div>
                        <form onSubmit={handleTransfer}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">New Owner ID *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={transferData.newOwnerId}
                                        onChange={e => setTransferData({ ...transferData, newOwnerId: e.target.value })}
                                        placeholder="OWN-..."
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Reason</label>
                                    <select
                                        className="form-input form-select"
                                        value={transferData.reason}
                                        onChange={e => setTransferData({ ...transferData, reason: e.target.value })}
                                    >
                                        <option value="">Select reason...</option>
                                        <option value="SOLD">Sold</option>
                                        <option value="GIFT">Gift</option>
                                        <option value="INHERITANCE">Inheritance</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => closeModal(setShowTransferModal)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? <span className="spinner" /> : 'Transfer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Replace Device Modal */}
            {showReplaceDeviceModal && (
                <div className={`modal-overlay ${modalClosing ? 'closing' : ''}`} onClick={() => closeModal(setShowReplaceDeviceModal)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Replace Device</h3>
                        </div>
                        <form onSubmit={handleReplaceDevice}>
                            <div className="modal-body">
                                <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                                    Current device: <strong>{vehicle.deviceId}</strong>
                                </p>
                                <div className="form-group">
                                    <label className="form-label">New Device ID *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={replaceDeviceData.newDeviceId}
                                        onChange={e => setReplaceDeviceData({ ...replaceDeviceData, newDeviceId: e.target.value })}
                                        placeholder="DEV-..."
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Reason *</label>
                                    <select
                                        className="form-input form-select"
                                        value={replaceDeviceData.reason}
                                        onChange={e => setReplaceDeviceData({ ...replaceDeviceData, reason: e.target.value })}
                                        required
                                    >
                                        <option value="FAULTY">Faulty</option>
                                        <option value="UPGRADE">Upgrade</option>
                                        <option value="LOST">Lost</option>
                                        <option value="STOLEN">Stolen</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Notes</label>
                                    <textarea
                                        className="form-input"
                                        value={replaceDeviceData.notes}
                                        onChange={e => setReplaceDeviceData({ ...replaceDeviceData, notes: e.target.value })}
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => closeModal(setShowReplaceDeviceModal)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? <span className="spinner" /> : 'Replace'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className={`modal-overlay ${modalClosing ? 'closing' : ''}`} onClick={() => closeModal(setShowDeleteModal)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Deregister Vehicle</h3>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to deregister <strong>{vehicle.registrationNo}</strong>?</p>
                            <p className="text-muted" style={{ marginTop: 'var(--spacing-sm)' }}>This action cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => closeModal(setShowDeleteModal)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleDelete} disabled={submitting}>
                                {submitting ? <span className="spinner" /> : 'Deregister'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VehicleDetail;
