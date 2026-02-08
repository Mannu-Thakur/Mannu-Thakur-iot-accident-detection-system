/**
 * Owner List Page
 * Enhanced owner listing with search, pagination, and actions
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import rtoService from '../../services/rto.service.js';
import { getInitials, formatDate } from '@shared/utils/formatters.js';
import Pagination from '@shared/components/UI/Pagination.jsx';

function OwnerList() {
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const navigate = useNavigate();

    useEffect(() => {
        loadOwners();
    }, [pagination.page, search]);

    const loadOwners = async () => {
        try {
            setLoading(true);
            const response = await rtoService.getOwners({
                page: pagination.page,
                limit: pagination.limit,
                search: search || undefined
            });
            setOwners(response.data || response);
            if (response.pagination) {
                setPagination(prev => ({ ...prev, ...response.pagination }));
            }
        } catch (error) {
            console.error('Failed to load owners:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Owners</h1>
                    <p className="text-muted">Manage vehicle owners and their emergency contacts</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/owners/new')}>
                    + Register Owner
                </button>
            </div>

            {/* Search and Filters */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div className="flex items-center gap-md">
                    <div style={{ flex: 1, position: 'relative' }}>
                        <svg
                            viewBox="0 0 24 24"
                            style={{
                                position: 'absolute',
                                left: 12,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 20,
                                height: 20,
                                stroke: 'var(--text-muted)',
                                fill: 'none',
                                strokeWidth: 2
                            }}
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search by name, email, or mobile..."
                            value={search}
                            onChange={handleSearch}
                            style={{ paddingLeft: 44 }}
                        />
                    </div>
                    <span className="text-muted">
                        {pagination.total} total owners
                    </span>
                </div>
            </div>

            {/* Owners Table */}
            <div className="card">
                {loading ? (
                    <div className="flex items-center justify-center" style={{ padding: '3rem' }}>
                        <div className="spinner" style={{ width: 32, height: 32 }} />
                    </div>
                ) : owners.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <h3>No owners found</h3>
                        <p className="text-muted">
                            {search ? 'Try a different search term' : 'Register your first owner to get started'}
                        </p>
                    </div>
                ) : (
                    <>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Owner</th>
                                    <th>Contact</th>
                                    <th>Nominees</th>
                                    <th>Registered</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {owners.map(owner => (
                                    <tr key={owner.ownerId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/owners/${owner.ownerId}`)}>
                                        <td>
                                            <div className="flex items-center gap-md">
                                                <div className="avatar">{getInitials(owner.fullName)}</div>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{owner.fullName}</div>
                                                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>{owner.ownerId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div>{owner.email}</div>
                                            <div className="text-muted" style={{ fontSize: '0.875rem' }}>{owner.mobileNumber}</div>
                                        </td>
                                        <td>
                                            <span className="badge">{owner.nominees?.length || 0} contacts</span>
                                        </td>
                                        <td>{formatDate(owner.createdAt)}</td>
                                        <td>
                                            <span className={`status-indicator status-${owner.isActive !== false ? 'active' : 'inactive'}`}>
                                                {owner.isActive !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div className="flex gap-sm">
                                                <Link to={`/owners/${owner.ownerId}`} className="btn btn-ghost btn-sm">
                                                    View
                                                </Link>
                                                <Link to={`/owners/${owner.ownerId}/edit`} className="btn btn-ghost btn-sm">
                                                    Edit
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div style={{ padding: 'var(--spacing-md)', borderTop: '1px solid var(--border-color)' }}>
                            <Pagination
                                currentPage={pagination.page}
                                totalPages={pagination.totalPages}
                                onPageChange={handlePageChange}
                            />
                        </div>

                    </>
                )}
            </div>
        </div>
    );
}

export default OwnerList;
