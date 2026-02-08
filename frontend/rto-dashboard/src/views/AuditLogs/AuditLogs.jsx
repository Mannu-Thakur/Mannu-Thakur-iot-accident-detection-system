/**
 * Audit Logs Page
 * View RTO activity logs with filters
 */

import { useState, useEffect } from 'react';
import rtoService from '../../services/rto.service.js';
import { formatDate } from '@shared/utils/formatters.js';

const ACTION_TYPES = [
    { value: '', label: 'All Actions' },
    { value: 'OWNER_CREATED', label: 'Owner Created' },
    { value: 'VEHICLE_REGISTERED', label: 'Vehicle Registered' },
    { value: 'VEHICLE_UPDATED', label: 'Vehicle Updated' },
    { value: 'VEHICLE_DELETED', label: 'Vehicle Deleted' },
    { value: 'OWNERSHIP_TRANSFERRED', label: 'Ownership Transferred' },
    { value: 'DEVICE_REPLACED', label: 'Device Replaced' },
];

function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [action, setAction] = useState('');
    const [targetId, setTargetId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

    useEffect(() => {
        loadLogs();
    }, [pagination.page, action]);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit
            };
            if (action) params.action = action;
            if (targetId) params.targetId = targetId;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const response = await rtoService.getAuditLogs(params);
            setLogs(response.data || response);
            if (response.pagination) {
                setPagination(prev => ({ ...prev, ...response.pagination }));
            }
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPagination(prev => ({ ...prev, page: 1 }));
        loadLogs();
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    const getActionBadgeClass = (actionType) => {
        if (actionType?.includes('CREATED') || actionType?.includes('REGISTERED')) return 'badge-success';
        if (actionType?.includes('DELETED')) return 'badge-danger';
        if (actionType?.includes('TRANSFERRED') || actionType?.includes('REPLACED')) return 'badge-warning';
        return '';
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Audit Logs</h1>
                    <p className="text-muted">Track all RTO actions and changes</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div className="flex items-center gap-md flex-wrap">
                    <select
                        className="form-input form-select"
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        style={{ width: 200 }}
                    >
                        {ACTION_TYPES.map(a => (
                            <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                    </select>

                    <input
                        type="text"
                        className="form-input"
                        placeholder="Target ID (VEH-xxx, OWN-xxx)"
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        style={{ width: 200 }}
                    />

                    <input
                        type="date"
                        className="form-input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{ width: 150 }}
                        title="Start Date"
                    />

                    <input
                        type="date"
                        className="form-input"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{ width: 150 }}
                        title="End Date"
                    />

                    <button className="btn btn-primary" onClick={handleSearch}>
                        Search
                    </button>

                    <span className="text-muted" style={{ marginLeft: 'auto' }}>
                        {pagination.total} logs
                    </span>
                </div>
            </div>

            {/* Logs Table */}
            <div className="card">
                {loading ? (
                    <div className="flex items-center justify-center" style={{ padding: '3rem' }}>
                        <div className="spinner" style={{ width: 32, height: 32 }} />
                    </div>
                ) : logs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <h3>No audit logs found</h3>
                        <p className="text-muted">
                            Try adjusting your filters or date range
                        </p>
                    </div>
                ) : (
                    <>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Action</th>
                                    <th>Actor</th>
                                    <th>Target</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log, i) => (
                                    <tr key={log._id || i}>
                                        <td>
                                            <div style={{ whiteSpace: 'nowrap' }}>
                                                {formatDate(log.createdAt, true)}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${getActionBadgeClass(log.action)}`}>
                                                {log.action?.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <div>{log.actorId || 'System'}</div>
                                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                {log.actorRole}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                                {log.targetId || '-'}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                {log.targetType}
                                            </div>
                                        </td>
                                        <td>
                                            {log.details ? (
                                                <details>
                                                    <summary style={{ cursor: 'pointer', color: 'var(--primary)' }}>
                                                        View details
                                                    </summary>
                                                    <pre style={{
                                                        fontSize: '0.75rem',
                                                        background: 'var(--bg-glass)',
                                                        padding: 'var(--spacing-sm)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        marginTop: 'var(--spacing-xs)',
                                                        maxWidth: 300,
                                                        overflow: 'auto'
                                                    }}>
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </details>
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between" style={{
                                padding: 'var(--spacing-md)',
                                borderTop: '1px solid var(--border-glass)'
                            }}>
                                <span className="text-muted">
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>
                                <div className="flex gap-sm">
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        disabled={pagination.page <= 1}
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        disabled={pagination.page >= pagination.totalPages}
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default AuditLogs;
