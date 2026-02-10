import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import incidentService from '../../services/incident.service';
import { formatRelativeTime } from '../../../../shared/utils/formatters';

function ActiveOperations() {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // Fetch Dispatched/In-Progress incidents
            const data = await incidentService.getIncidents({ status: 'DISPATCHED' });
            setIncidents(data || []);
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
                    <h1 className="page-title">Active Operations</h1>
                    <p className="page-subtitle">Ongoing rescue missions and live updates</p>
                </div>
                <button className="btn btn-secondary" onClick={loadData}>Refresh</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex justify-center p-12"><div className="spinner" /></div>
                ) : incidents.length === 0 ? (
                    <div className="col-span-full empty-state">
                        <h3>No active operations</h3>
                        <p>All dispatched missions have been resolved.</p>
                    </div>
                ) : (
                    incidents.map(inc => (
                        <div key={inc.incidentId} className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/incidents/${inc.incidentId}`)}>
                            <div className="flex justify-between items-start mb-4">
                                <span className={`badge badge-primary`}>DISPATCHED</span>
                                <span className={`text-xs text-muted`}>{formatRelativeTime(inc.timestamp?.serverTimestamp)}</span>
                            </div>
                            <h3 className="text-lg font-bold mb-2">{inc.incidentId}</h3>
                            <p className="text-muted text-sm mb-4 truncate">{inc.address || 'Location unavailable'}</p>

                            <div className="border-t pt-4 mt-auto">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium">Severity: {inc.severityLevel}</span>
                                    <button className="text-primary hover:underline">View Details →</button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default ActiveOperations;
