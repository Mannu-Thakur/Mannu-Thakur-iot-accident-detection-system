/**
 * Incident List Page
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import incidentService from '../../services/incident.service.js';
import { formatRelativeTime, formatStatus } from '../../../../shared/utils/formatters.js';

function IncidentList() {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        loadIncidents();
    }, [filter]);

    const loadIncidents = async () => {
        try {
            setLoading(true);
            const filters = {};
            if (filter !== 'all') {
                filters.status = filter;
            }
            const data = await incidentService.getIncidents({ ...filters, limit: 50 });
            setIncidents(data);
        } catch (error) {
            console.error('Failed to load incidents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (incidentId) => {
        navigate(`/incidents/${incidentId}`);
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Incidents</h1>
                    <p className="page-subtitle">Manage and monitor all incidents</p>
                </div>
                <div className="flex gap-sm">
                    <select
                        className="form-input form-select"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{ width: 'auto' }}
                    >
                        <option value="all">All Status</option>
                        <option value="REPORTED">Reported</option>
                        <option value="VERIFIED">Verified</option>
                        <option value="DISPATCHED">Dispatched</option>
                        <option value="RESOLVED">Resolved</option>
                    </select>
                    <button className="btn btn-secondary" onClick={loadIncidents}>
                        Refresh
                    </button>
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div className="flex items-center justify-center" style={{ padding: '3rem' }}>
                        <div className="spinner" />
                    </div>
                ) : incidents.length === 0 ? (
                    <div className="empty-state">
                        <h4 className="empty-state-title">No incidents found</h4>
                        <p className="empty-state-text">No incidents match the current filter.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Severity</th>
                                    <th>Incident ID</th>
                                    <th>Vehicle</th>
                                    <th>Location</th>
                                    <th>Status</th>
                                    <th>Reported</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incidents.map(incident => (
                                    <tr
                                        key={incident.incidentId}
                                        className="incident-row"
                                        onClick={() => handleRowClick(incident.incidentId)}
                                    >
                                        <td>
                                            <span className={`incident-severity severity-${incident.severityLevel}`}>
                                                {incident.severityLevel}
                                            </span>
                                        </td>
                                        <td className="font-medium">{incident.incidentId}</td>
                                        <td>{incident.vehicle?.registrationNo || incident.vehicleId}</td>
                                        <td className="truncate" style={{ maxWidth: 200 }}>
                                            {incident.address || 'Location unavailable'}
                                        </td>
                                        <td>
                                            <span className={`badge badge-${getStatusBadge(incident.status)}`}>
                                                {formatStatus(incident.status)}
                                            </span>
                                        </td>
                                        <td className="text-muted">
                                            {formatRelativeTime(incident.timestamp?.serverTimestamp)}
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

export default IncidentList;
