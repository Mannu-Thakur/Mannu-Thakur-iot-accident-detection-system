/**
 * Staff Management Page
 * Full CRUD operations with advanced UI
 */

import { useState, useEffect } from 'react';
import { useToast } from '@shared/hooks/useToast.jsx';
import rtoService from '../../services/rto.service.js';

const ROLES = [
    { value: 'RTO_STAFF', label: 'RTO Staff' },
    { value: 'RTO_CLERK', label: 'RTO Clerk' },
    { value: 'RTO_OFFICER', label: 'RTO Officer' },
];

function Staff() {
    const { success, error } = useToast();
    const [staffList, setStaffList] = useState([]);
    const [loadingStaff, setLoadingStaff] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [modalClosing, setModalClosing] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'RTO_STAFF',
    });

    // Search and filter
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadStaff();
    }, []);

    const loadStaff = async () => {
        try {
            setLoadingStaff(true);
            console.log('[Staff] Loading staff members...');
            const data = await rtoService.getStaff();
            console.log('[Staff] Staff data received:', data);
            setStaffList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('[Staff] Failed to load staff:', err);
            error('Failed to load staff members: ' + (err.message || 'Unknown error'));
            setStaffList([]);
        } finally {
            setLoadingStaff(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', email: '', password: '', role: 'RTO_STAFF' });
    };

    const closeModal = (setModalFn) => {
        setModalClosing(true);
        setTimeout(() => {
            setModalFn(false);
            setModalClosing(false);
            setSelectedStaff(null);
            resetForm();
        }, 350);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const openEditModal = (staff) => {
        setSelectedStaff(staff);
        setFormData({
            name: staff.name || '',
            email: staff.email || '',
            password: '',
            role: staff.role || 'RTO_STAFF',
        });
        setShowEditModal(true);
    };

    const openDeleteModal = (staff) => {
        setSelectedStaff(staff);
        setShowDeleteModal(true);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await rtoService.createStaff(formData);
            success('Staff member created successfully');
            closeModal(setShowCreateModal);
            loadStaff();
        } catch (err) {
            error(err.message || 'Failed to create staff');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!selectedStaff) return;
        setSubmitting(true);
        try {
            const updateData = { name: formData.name, email: formData.email };
            if (formData.password) updateData.password = formData.password;
            await rtoService.updateStaff(selectedStaff._id, updateData);
            success('Staff member updated successfully');
            closeModal(setShowEditModal);
            loadStaff();
        } catch (err) {
            error(err.message || 'Failed to update staff');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedStaff) return;
        setSubmitting(true);
        try {
            await rtoService.deleteStaff(selectedStaff._id);
            success('Staff member deleted successfully');
            closeModal(setShowDeleteModal);
            loadStaff();
        } catch (err) {
            error(err.message || 'Failed to delete staff');
        } finally {
            setSubmitting(false);
        }
    };

    // Filter staff by search query
    const filteredStaff = staffList.filter(staff => {
        const query = searchQuery.toLowerCase();
        return (
            staff.name?.toLowerCase().includes(query) ||
            staff.email?.toLowerCase().includes(query)
        );
    });

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Staff Management</h1>
                    <p className="text-muted">Create, edit, and manage RTO staff accounts</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <path d="M12 5v14m-7-7h14" />
                    </svg>
                    Add Staff
                </button>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div className="card stat-card">
                    <div className="stat-icon stat-icon-primary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Total Staff</div>
                        <div className="stat-value">{staffList.length}</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon stat-icon-success">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                            <path d="M22 4L12 14.01l-3-3" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Active</div>
                        <div className="stat-value">{staffList.filter(s => s.isActive !== false).length}</div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"
                            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingLeft: 40 }}
                        />
                    </div>
                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                        {filteredStaff.length} of {staffList.length} staff
                    </span>
                </div>
            </div>

            {/* Staff List */}
            {loadingStaff ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto' }} />
                    <p className="text-muted" style={{ marginTop: '1rem' }}>Loading staff...</p>
                </div>
            ) : filteredStaff.length > 0 ? (
                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Staff Member</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Created</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStaff.map((staff) => (
                                    <tr key={staff._id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                                <div className="avatar avatar-sm" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                                                    {getInitials(staff.name)}
                                                </div>
                                                <span style={{ fontWeight: 500 }}>{staff.name}</span>
                                            </div>
                                        </td>
                                        <td className="text-muted">{staff.email}</td>
                                        <td>
                                            <span className="badge badge-gray">{staff.role || 'RTO_STAFF'}</span>
                                        </td>
                                        <td className="text-muted" style={{ fontSize: '0.875rem' }}>
                                            {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : '-'}
                                        </td>
                                        <td>
                                            <span className={`status-indicator ${staff.isActive !== false ? 'status-active' : 'status-inactive'}`}>
                                                <span className={`status-dot ${staff.isActive !== false ? 'online' : 'offline'}`}></span>
                                                {staff.isActive !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => openEditModal(staff)}
                                                    title="Edit"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => openDeleteModal(staff)}
                                                    title="Delete"
                                                    style={{ color: 'var(--color-danger)' }}
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ width: 64, height: 64, margin: '0 auto 1rem' }}>
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    <h3>{searchQuery ? 'No matching staff found' : 'No Staff Added Yet'}</h3>
                    <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                        {searchQuery ? 'Try adjusting your search query' : 'Click "Add Staff" to create a new RTO staff member account.'}
                    </p>
                    {!searchQuery && (
                        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                            Add First Staff Member
                        </button>
                    )}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className={`modal-overlay ${modalClosing ? 'closing' : ''}`} onClick={() => closeModal(setShowCreateModal)}>
                    <div className="modal-content" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add New Staff Member</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => closeModal(setShowCreateModal)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Full Name *</label>
                                    <input
                                        name="name"
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Enter full name"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email Address *</label>
                                    <input
                                        name="email"
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="staff@rto.gov.in"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Password *</label>
                                    <input
                                        name="password"
                                        type="password"
                                        className="form-input"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Minimum 8 characters"
                                        minLength={8}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <select
                                        name="role"
                                        className="form-input form-select"
                                        value={formData.role}
                                        onChange={handleChange}
                                    >
                                        {ROLES.map(r => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => closeModal(setShowCreateModal)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? <span className="spinner" /> : 'Create Staff'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && selectedStaff && (
                <div className={`modal-overlay ${modalClosing ? 'closing' : ''}`} onClick={() => closeModal(setShowEditModal)}>
                    <div className="modal-content" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Edit Staff Member</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => closeModal(setShowEditModal)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleUpdate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Full Name *</label>
                                    <input
                                        name="name"
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Enter full name"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email Address *</label>
                                    <input
                                        name="email"
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="staff@rto.gov.in"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">New Password</label>
                                    <input
                                        name="password"
                                        type="password"
                                        className="form-input"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Leave empty to keep current"
                                        minLength={8}
                                    />
                                    <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                                        Leave blank to keep the current password
                                    </p>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => closeModal(setShowEditModal)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? <span className="spinner" /> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedStaff && (
                <div className={`modal-overlay ${modalClosing ? 'closing' : ''}`} onClick={() => closeModal(setShowDeleteModal)}>
                    <div className="modal-content" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Delete Staff Member</h3>
                        </div>
                        <div className="modal-body">
                            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-md)' }}>
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
                                    Are you sure you want to delete <strong>{selectedStaff.name}</strong>?
                                </p>
                                <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                                    This will deactivate their account. They will no longer be able to access the system.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'center' }}>
                            <button className="btn btn-ghost" onClick={() => closeModal(setShowDeleteModal)}>
                                Cancel
                            </button>
                            <button className="btn btn-danger" onClick={handleDelete} disabled={submitting}>
                                {submitting ? <span className="spinner" /> : 'Delete Staff'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Staff;
