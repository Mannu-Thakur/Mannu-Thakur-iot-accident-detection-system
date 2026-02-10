import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import incidentService from '../../services/incident.service';
import { getSeverityColor } from '../../../../shared/utils/formatters';

function HighZoneMap() {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await incidentService.getIncidents({ limit: 500 }); // Get many for heatmap effect
            setIncidents(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="page-header">
                <div>
                    <h1 className="page-title">High Zone Map</h1>
                    <p className="page-subtitle">Real-time heatmap of incident density and severity</p>
                </div>
            </div>
            <div className="card flex-1 p-0 overflow-hidden relative">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="spinner" />
                    </div>
                ) : (
                    <MapContainer
                        center={[18.5204, 73.8567]} // Default Pune
                        zoom={12}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                        />
                        {incidents.map(inc => inc.location?.coordinates && (
                            <CircleMarker
                                key={inc.incidentId}
                                center={[inc.location.coordinates[1], inc.location.coordinates[0]]}
                                radius={10 + (inc.severityLevel * 5)}
                                pathOptions={{
                                    color: getSeverityColor(inc.severityLevel) === 'danger' ? '#ef4444' :
                                        getSeverityColor(inc.severityLevel) === 'warning' ? '#f59e0b' : '#3b82f6',
                                    fillColor: getSeverityColor(inc.severityLevel) === 'danger' ? '#ef4444' :
                                        getSeverityColor(inc.severityLevel) === 'warning' ? '#f59e0b' : '#3b82f6',
                                    fillOpacity: 0.3,
                                    stroke: false
                                }}
                            >
                                <Popup>
                                    <strong>{inc.incidentId}</strong><br />
                                    Severity: {inc.severityLevel}<br />
                                    Type: {inc.type || 'General'}
                                </Popup>
                            </CircleMarker>
                        ))}
                    </MapContainer>
                )}
            </div>
        </div>
    );
}

export default HighZoneMap;
