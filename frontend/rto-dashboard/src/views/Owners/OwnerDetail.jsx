/**
 * Owner Detail Page
 * Modern UI with comprehensive owner profile, nominees, documents, and vehicles
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import rtoService from '../../services/rto.service.js';
import { useToast } from '@shared/hooks/useToast.jsx';
import { formatDate, getInitials } from '@shared/utils/formatters.js';

function OwnerDetail() {
    const { ownerId } = useParams();
    const navigate = useNavigate();
    const { success, error } = useToast();

    const [owner, setOwner] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [modalClosing, setModalClosing] = useState(false);
    const [activeTab, setActiveTab] = useState('vehicles');

    useEffect(() => {
        loadOwner();
    }, [ownerId]);

    const loadOwner = async () => {
        try {
            setLoading(true);
            const ownerData = await rtoService.getOwner(ownerId);
            setOwner(ownerData);

            // Load vehicles for this owner
            const vehiclesRes = await rtoService.getVehicles({ ownerId });
            setVehicles(vehiclesRes.data || []);
        } catch (err) {
            error('Failed to load owner details');
            navigate('/owners');
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

    const handleDelete = async () => {
        closeModal(setShowDeleteModal);
        success('Owner deletion is not yet implemented');
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    if (!owner) return null;

    return (
        <div>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 'var(--spacing-md)' }}>
                <button className="btn btn-ghost" onClick={() => navigate('/owners')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Owners
                </button>
            </div>

            {/* Profile Card */}
            <div className="card" style={{
                marginBottom: 'var(--spacing-lg)',
                background: 'linear-gradient(to right, var(--bg-primary), var(--bg-secondary))',
                border: '1px solid var(--border-color)'
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
                    <div className="avatar" style={{
                        width: 100,
                        height: 100,
                        fontSize: '2.5rem',
                        background: 'var(--color-primary)',
                        color: 'white',
                        boxShadow: 'var(--shadow-md)',
                        border: '4px solid var(--bg-primary)'
                    }}>
                        {getInitials(owner.fullName)}
                    </div>

                    <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xs)' }}>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{owner.fullName}</h1>
                            <span className={`badge ${owner.isActive ? 'badge-success' : 'badge-gray'}`}>
                                {owner.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}>
                            <div className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21l1.65-3.8a9 9 0 113.4 2.9L3 21" /></svg>
                                {owner.mobileNumber}
                            </div>
                            <div className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                {owner.email}
                            </div>
                            <div className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                {owner.address || 'No address provided'}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                            <div style={{ paddingRight: 'var(--spacing-lg)', borderRight: '1px solid var(--border-color)' }}>
                                <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Owner ID</div>
                                <div style={{ fontFamily: 'monospace', fontWeight: 500 }}>{owner.ownerId}</div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Registered</div>
                                <div style={{ fontWeight: 500 }}>{formatDate(owner.createdAt)}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignSelf: 'flex-start' }}>
                        <button className="btn btn-secondary" onClick={() => navigate(`/owners/${ownerId}/edit`)}>
                            Edit Profile
                        </button>
                        <button className="btn btn-danger btn-icon" onClick={() => setShowDeleteModal(true)} title="Delete Owner">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="stats-grid" style={{ marginBottom: 'var(--spacing-lg)' }}>
                {/* ... existing stats ... */}
                <div className="card stat-card">
                    <div className="stat-icon stat-icon-primary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="1" y="6" width="22" height="12" rx="2" />
                            <circle cx="6" cy="12" r="2" />
                            <circle cx="18" cy="12" r="2" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Vehicles</div>
                        <div className="stat-value">{vehicles.length}</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon stat-icon-warning">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Nominees</div>
                        <div className="stat-value">{owner.nominees?.length || 0}</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon stat-icon-success">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Documents</div>
                        <div className="stat-value">{owner.documents?.length || 0}</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 'var(--spacing-lg)' }}>
                {['vehicles', 'nominees', 'documents'].map(tab => (
                    <button
                        key={tab}
                        className={`tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {tab === 'vehicles' && <span className="badge badge-gray" style={{ marginLeft: 8 }}>{vehicles.length}</span>}
                        {tab === 'nominees' && <span className="badge badge-gray" style={{ marginLeft: 8 }}>{owner.nominees?.length || 0}</span>}
                        {tab === 'documents' && <span className="badge badge-gray" style={{ marginLeft: 8 }}>{owner.documents?.length || 0}</span>}
                    </button>
                ))}
            </div>

            {/* Vehicles Tab */}
            {activeTab === 'vehicles' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Registered Vehicles ({vehicles.length})</h3>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/vehicles/new')}>
                            + Register Vehicle
                        </button>
                    </div>
                    {vehicles.length > 0 ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Registration No</th>
                                        <th>Type</th>
                                        <th>Manufacturer</th>
                                        <th>Model</th>
                                        <th>Device</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vehicles.map(v => (
                                        <tr key={v.vehicleId}>
                                            <td><strong style={{ fontFamily: 'monospace' }}>{v.registrationNo}</strong></td>
                                            <td><span className="badge badge-primary">{v.vehicleType}</span></td>
                                            <td>{v.manufacturer || '-'}</td>
                                            <td>{v.model || '-'}</td>
                                            <td>
                                                {v.deviceId ? (
                                                    <span className="badge badge-success">Bound</span>
                                                ) : (
                                                    <span className="badge badge-gray">None</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`status-indicator ${v.isActive ? 'status-active' : 'status-inactive'}`}>
                                                    <span className={`status-dot ${v.isActive ? 'online' : 'offline'}`}></span>
                                                    {v.status || (v.isActive ? 'Active' : 'Inactive')}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <Link to={`/vehicles/${v.vehicleId}`} className="btn btn-ghost btn-sm">
                                                    View →
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ width: 48, height: 48, margin: '0 auto var(--spacing-md)' }}>
                                <rect x="1" y="6" width="22" height="12" rx="2" />
                                <circle cx="6" cy="12" r="2" />
                                <circle cx="18" cy="12" r="2" />
                            </svg>
                            <p className="text-muted">No vehicles registered to this owner</p>
                            <button className="btn btn-primary" onClick={() => navigate('/vehicles/new')} style={{ marginTop: 'var(--spacing-md)' }}>
                                Register First Vehicle
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Nominees Tab */}
            {activeTab === 'nominees' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Emergency Contacts ({owner.nominees?.length || 0})</h3>
                    </div>
                    {owner.nominees?.length > 0 ? (
                        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                            {owner.nominees.map((nominee, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: 'var(--spacing-md)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    background: nominee.isPrimary ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                        <div className="avatar" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                                            {getInitials(nominee.name)}
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                                <strong>{nominee.name}</strong>
                                                {nominee.isPrimary && <span className="badge badge-primary">Primary</span>}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                                                {nominee.relation || 'Relation not specified'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 500 }}>{nominee.phone}</div>
                                        {nominee.address && (
                                            <div className="text-muted" style={{ fontSize: '0.875rem' }}>{nominee.address}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ width: 48, height: 48, margin: '0 auto var(--spacing-md)' }}>
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                            </svg>
                            <p className="text-muted">No emergency contacts registered</p>
                        </div>
                    )}
                </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Documents ({owner.documents?.length || 0})</h3>
                    </div>
                    {owner.documents?.length > 0 ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Document Type</th>
                                        <th>Number</th>
                                        <th>Status</th>
                                        <th>Verified At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {owner.documents.map((doc, i) => (
                                        <tr key={i}>
                                            <td><span className="badge badge-gray">{doc.type}</span></td>
                                            <td style={{ fontFamily: 'monospace' }}>{doc.number}</td>
                                            <td>
                                                {doc.verifiedAt ? (
                                                    <span className="badge badge-success">Verified</span>
                                                ) : (
                                                    <span className="badge badge-warning">Pending</span>
                                                )}
                                            </td>
                                            <td className="text-muted">{doc.verifiedAt ? formatDate(doc.verifiedAt) : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ width: 48, height: 48, margin: '0 auto var(--spacing-md)' }}>
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                <path d="M14 2v6h6" />
                            </svg>
                            <p className="text-muted">No documents uploaded</p>
                        </div>
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className={`modal-overlay ${modalClosing ? 'closing' : ''}`} onClick={() => closeModal(setShowDeleteModal)}>
                    <div className="modal-content" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Delete Owner</h3>
                        </div>
                        <div className="modal-body">
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: '50%',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto var(--spacing-md)'
                                }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" width="32" height="32">
                                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                    </svg>
                                </div>
                                <p style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    Are you sure you want to delete <strong>{owner.fullName}</strong>?
                                </p>
                                <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                                    This action cannot be undone. All associated data will be permanently removed.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'center' }}>
                            <button className="btn btn-ghost" onClick={() => closeModal(setShowDeleteModal)}>
                                Cancel
                            </button>
                            <button className="btn btn-danger" onClick={handleDelete}>
                                Delete Owner
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OwnerDetail;
