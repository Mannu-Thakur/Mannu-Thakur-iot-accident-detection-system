/**
 * Authority List Page
 * Full CRUD with Edit/Delete actions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import stateService from '../../services/state.service.js';
import { useToast } from '../../../../shared/hooks/useToast';
import { formatNumber } from '../../../../shared/utils/formatters.js';

function AuthorityList() {
    const [authorities, setAuthorities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ open: false, authority: null });
    const [deleting, setDeleting] = useState(false);
    const [closing, setClosing] = useState(false);
    const navigate = useNavigate();
    const { success, error: showError } = useToast();

    useEffect(() => {
        loadAuthorities();
    }, []);

    const loadAuthorities = async () => {
        try {
            setLoading(true);
            const result = await stateService.getAuthorities({ limit: 100 });
            setAuthorities(result || []);
        } catch (error) {
            console.error('Failed to load authorities:', error);
            showError('Failed to load authorities');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.authority) return;

        try {
            setDeleting(true);
            await stateService.deleteAuthority(deleteModal.authority.authorityId);
            success('Authority deleted successfully');
            setDeleteModal({ open: false, authority: null });
            loadAuthorities();
        } catch (err) {
            showError(err.message || 'Failed to delete authority');
        } finally {
            setDeleting(false);
        }
    };

    const openDeleteModal = (auth, e) => {
        e.stopPropagation();
        setClosing(false);
        setDeleteModal({ open: true, authority: auth });
    };

    const closeModal = () => {
        setClosing(true);
        setTimeout(() => {
            setDeleteModal({ open: false, authority: null });
            setClosing(false);
        }, 400);
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Local Authorities</h1>
                    <p className="page-subtitle">Manage district-level emergency authorities</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/authorities/new')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{ marginRight: '0.5rem' }}>
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add Authority
                </button>
            </div>

            <div className="card">
                {loading ? (
                    <div className="flex items-center justify-center" style={{ padding: '3rem' }}>
                        <div className="spinner" />
                    </div>
                ) : authorities.length === 0 ? (
                    <div className="empty-state">
                        <h4 className="empty-state-title">No authorities found</h4>
                        <p className="empty-state-text">Add your first local authority to get started.</p>
                        <button className="btn btn-primary" onClick={() => navigate('/authorities/new')}>
                            Add Authority
                        </button>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Code</th>
                                    <th>District</th>
                                    <th>Contact</th>
                                    <th>Incidents</th>
                                    <th>Employees</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {authorities.map(auth => (
                                    <tr key={auth.authorityId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/authorities/${auth.authorityId}`)}>
                                        <td className="font-medium">{auth.name}</td>
                                        <td><span className="badge badge-gray">{auth.code}</span></td>
                                        <td>{auth.district || '-'}</td>
                                        <td style={{ fontSize: '0.875rem' }}>
                                            <div>{auth.contactEmail || '-'}</div>
                                            <div style={{ color: 'var(--text-muted)' }}>{auth.contactPhone || ''}</div>
                                        </td>
                                        <td>{formatNumber(auth.incidentsHandled || 0)}</td>
                                        <td>{auth.availableEmployees || 0}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/authorities/${auth.authorityId}`); }}
                                                    title="View Details"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                        <circle cx="12" cy="12" r="3" />
                                                    </svg>
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/authorities/${auth.authorityId}/edit`); }}
                                                    title="Edit"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={(e) => openDeleteModal(auth, e)}
                                                    title="Delete"
                                                    style={{ color: 'var(--color-danger)' }}
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                                        <line x1="10" y1="11" x2="10" y2="17" />
                                                        <line x1="14" y1="11" x2="14" y2="17" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteModal.open && (
                <div className={`modal-overlay ${closing ? 'closing' : ''}`} onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Delete Authority</h3>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete <strong>{deleteModal.authority?.name}</strong>?</p>
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
}

export default AuthorityList;
