import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import incidentService from '../../services/incident.service';
import { formatRelativeTime } from '../../../../shared/utils/formatters';

function IncidentQueue() {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // Fetch Reported and Verified incidents (Unassigned)
            const reported = await incidentService.getIncidents({ status: 'REPORTED' });
            const verified = await incidentService.getIncidents({ status: 'VERIFIED' });
            setIncidents([...(reported || []), ...(verified || [])]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Incident Queue</h1>
                    <p className="page-subtitle">Unassigned incidents requiring immediate attention</p>
                </div>
                <button className="btn btn-secondary" onClick={loadData}>Refresh</button>
            </div>

            <div className="card">
                {loading ? (
                    <div className="flex justify-center p-8"><div className="spinner" /></div>
                ) : incidents.length === 0 ? (
                    <div className="empty-state">
                        <h3>No pending incidents</h3>
                        <p>Good job! All incidents are assigned or resolved.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Severity</th>
                                    <th>ID</th>
                                    <th>Location</th>
                                    <th>Time</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incidents.map(inc => (
                                    <tr key={inc.incidentId} onClick={() => navigate(`/incidents/${inc.incidentId}`)} className="cursor-pointer hover:bg-gray-50">
                                        <td>
                                            <span className={`incident-severity severity-${inc.severityLevel}`}>{inc.severityLevel}</span>
                                        </td>
                                        <td className="font-medium">{inc.incidentId}</td>
                                        <td>{inc.address || 'Unknown Location'}</td>
                                        <td>{formatRelativeTime(inc.timestamp?.serverTimestamp)}</td>
                                        <td>
                                            <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/incidents/${inc.incidentId}`); }}>
                                                Assign Team
                                            </button>
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

export default IncidentQueue;
