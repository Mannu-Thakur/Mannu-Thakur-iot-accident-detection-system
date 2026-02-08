/**
 * Recent Incidents Component
 * Table of recent incidents
 */

import { formatRelativeTime, formatStatus } from '../../../../shared/utils/formatters.js';

function RecentIncidents({ incidents, onIncidentClick }) {
    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">Recent Incidents</h3>
                <a href="/incidents" className="btn btn-ghost btn-sm">View All</a>
            </div>

            {incidents.length === 0 ? (
                <div className="empty-state">
                    <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <h4 className="empty-state-title">No incidents</h4>
                    <p className="empty-state-text">No incidents have been reported yet.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Severity</th>
                                <th>Incident ID</th>
                                <th>Vehicle</th>
                                <th>Status</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {incidents.map(incident => (
                                <tr
                                    key={incident.incidentId}
                                    className="incident-row"
                                    onClick={() => onIncidentClick(incident.incidentId)}
                                >
                                    <td>
                                        <span className={`incident-severity severity-${incident.severityLevel}`}>
                                            {incident.severityLevel}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="font-medium">{incident.incidentId}</span>
                                    </td>
                                    <td>
                                        {incident.vehicle?.registrationNo || incident.vehicleId}
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

export default RecentIncidents;
