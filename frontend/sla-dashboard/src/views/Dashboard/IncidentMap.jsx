import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { stateService } from '../../services/state.service';
import { useToast } from '../../../../shared/hooks/useToast';
import L from 'leaflet';

const IncidentMap = () => {
    const [stats, setStats] = useState([]);
    const [districts, setDistricts] = useState({});
    const [loading, setLoading] = useState(true);
    const { error: showError } = useToast();
    const [center, setCenter] = useState([20.5937, 78.9629]);
    const [zoom, setZoom] = useState(6);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [incidentsData, authsData] = await Promise.all([
                stateService.getIncidentsByDistrict(),
                stateService.getAuthorities({ limit: 1000 })
            ]);

            setStats(incidentsData || []);

            // Create a map of district -> coordinates (using first LA found in district)
            const districtMap = {};
            const authorities = authsData.data || [];
            if (authorities.length > 0) {
                authorities.forEach(a => {
                    if (a.district && a.location?.coordinates && !districtMap[a.district]) {
                        districtMap[a.district] = [a.location.coordinates[1], a.location.coordinates[0]];
                    }
                });

                // Set center to first valid district if we have data
                const first = Object.values(districtMap)[0];
                if (first) {
                    setCenter(first);
                    // Adjust zoom based on spread roughly? Keep 6 or 7
                    setZoom(7);
                }
            }
            setDistricts(districtMap);

        } catch (err) {
            console.error(err);
            // showError(err.message || 'Failed to load map data'); // Suppress initial load errors to avoid toast spam
        } finally {
            setLoading(false);
        }
    };

    const getColor = (count) => {
        if (count > 50) return '#EF4444'; // Red
        if (count > 20) return '#F97316'; // Orange
        if (count > 5) return '#EAB308'; // Yellow
        return '#3B82F6'; // Blue
    }

    if (loading) return <div className="h-[500px] flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg"><div className="spinner"></div></div>;

    return (
        <div className="card p-0 overflow-hidden h-[500px] relative z-0 shadow-none border border-gray-200 dark:border-gray-700">
            <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />

                {stats.map(stat => {
                    const position = districts[stat._id];
                    if (!position) return null;

                    return (
                        <CircleMarker
                            key={stat._id}
                            center={position}
                            pathOptions={{ fillColor: getColor(stat.count), color: getColor(stat.count), fillOpacity: 0.6, weight: 1 }}
                            radius={Math.min(stat.count * 2 + 10, 50)}
                        >
                            <Popup>
                                <div className="p-2 min-w-[120px]">
                                    <h3 className="font-bold text-lg">{stat._id}</h3>
                                    <div className="mt-1 text-sm">
                                        <p><strong>Total Incidents:</strong> {stat.count}</p>
                                        <p><strong>Critical:</strong> {stat.critical}</p>
                                        <p><strong>Avg Severity:</strong> {Math.round(stat.avgSeverity * 10) / 10}</p>
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>

            {/* Legend Overlay */}
            <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 p-2 rounded shadow-md z-[1000] text-xs">
                <div className="font-semibold mb-1">Incident Intensity</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> 1-5</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> 6-20</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500"></span> 21-50</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> 50+</div>
            </div>
        </div>
    );
};

export default IncidentMap;
