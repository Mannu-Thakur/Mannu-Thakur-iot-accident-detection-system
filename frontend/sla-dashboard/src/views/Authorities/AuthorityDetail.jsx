import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { stateService } from '../../services/state.service';
import { useToast } from '../../../../shared/hooks/useToast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const AuthorityDetail = () => {
    const { authorityId } = useParams();
    const navigate = useNavigate();
    const { success, error: showError } = useToast();
    const [authority, setAuthority] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [closing, setClosing] = useState(false);

    const closeModal = () => {
        setClosing(true);
        setTimeout(() => {
            setDeleteModal(false);
            setClosing(false);
        }, 400);
    };

    useEffect(() => {
        fetchAuthority();
    }, [authorityId]);

    const fetchAuthority = async () => {
        try {
            setLoading(true);
            const data = await stateService.getAuthority(authorityId);
            setAuthority(data);
        } catch (err) {
            showError(err.message || 'Failed to fetch authority details');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            setDeleting(true);
            await stateService.deleteAuthority(authorityId);
            success('Authority deleted successfully');
            navigate('/authorities');
        } catch (err) {
            showError(err.message || 'Failed to delete authority');
        } finally {
            setDeleting(false);
        }
    };

    if (loading) return <div className="p-4 flex justify-center"><div className="spinner"></div></div>;
    if (!authority) return <div className="p-4 text-center">Authority not found</div>;

    const location = authority.location?.coordinates
        ? [authority.location.coordinates[1], authority.location.coordinates[0]]
        : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{authority.name}</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{authority.district}, {authority.state}</p>
                    <span className="badge badge-gray" style={{ marginTop: '0.5rem' }}>{authority.code}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => navigate(`/authorities/${authorityId}/edit`)} className="btn btn-outline">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ marginRight: '0.5rem' }}>
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                    </button>
                    <button onClick={() => setDeleteModal(true)} className="btn btn-danger">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ marginRight: '0.5rem' }}>
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                        Delete
                    </button>
                    <button onClick={() => navigate('/authorities')} className="btn btn-ghost">
                        ← Back
                    </button>
                </div>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
                {/* Contact Info Card */}
                <div className="card">
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>Contact Information</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'block' }}>Email</span>
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{authority.contactEmail || 'N/A'}</span>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'block' }}>Phone</span>
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{authority.contactPhone || 'N/A'}</span>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'block' }}>Address</span>
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{authority.address || 'N/A'}</span>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'block' }}>Authority ID</span>
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{authority.authorityId}</span>
                        </div>
                    </div>
                </div>

                {/* Stats Card */}
                <div className="card">
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>Statistics & Resources</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'block' }}>Incidents Handled</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgb(59, 130, 246)' }}>{authority.incidentsHandled || 0}</span>
                        </div>
                        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'block' }}>Total Employees</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgb(16, 185, 129)' }}>{authority.totalEmployees || 0}</span>
                        </div>
                        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'block' }}>Available Staff</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgb(139, 92, 246)' }}>{authority.availableEmployees || 0}</span>
                        </div>
                        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'block' }}>Avg Response</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgb(245, 158, 11)' }}>{Math.round(authority.averageResponseMinutes || 0)} min</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Location */}
            {location && (
                <div className="card" style={{ padding: 0, overflow: 'hidden', height: '400px' }}>
                    <MapContainer center={location} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                        <Marker position={location}>
                            <Popup>{authority.name}</Popup>
                        </Marker>
                    </MapContainer>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal && (
                <div className={`modal-overlay ${closing ? 'closing' : ''}`} onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Delete Authority</h3>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete <strong>{authority.name}</strong>?</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                This action cannot be undone. The associated user account will also be deleted.
                            </p>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-ghost"
                                onClick={closeModal}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuthorityDetail;
