import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { stateService } from '../../services/state.service';
import { useToast } from '../../../../shared/hooks/useToast';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const LAMapView = () => {
    const [authorities, setAuthorities] = useState([]);
    const [loading, setLoading] = useState(true);
    const { error: showError } = useToast();
    const navigate = useNavigate();
    const [center, setCenter] = useState([20.5937, 78.9629]);
    const [zoom, setZoom] = useState(5);

    useEffect(() => { fetchAuthorities(); }, []);

    const fetchAuthorities = async () => {
        try {
            setLoading(true);
            // Create a map of district -> coordinates (using first LA found in district)
            const districtMap = {};
            const result = await stateService.getAuthorities({ limit: 1000 });
            const authorities = result || [];
            setAuthorities(authorities);
            if (authorities.length > 0) {
                const valid = authorities.filter(a => a.location?.coordinates);
                if (valid.length > 0) {
                    setCenter([valid[0].location.coordinates[1], valid[0].location.coordinates[0]]);
                    setZoom(7);
                }
            }
        } catch (err) { showError(err.message || 'Failed to fetch authorities'); } finally { setLoading(false); }
    };

    if (loading) return <div className="p-4 flex justify-center"><div className="spinner"></div></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold dark:text-white">Local Authorities Map</h1>
            <div className="card" style={{ height: '600px', padding: 0, overflow: 'hidden', position: 'relative', zIndex: 0 }}>
                <MapContainer key={`${center[0]}-${center[1]}-${authorities.length}`} center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                    {authorities.map(auth => auth.location?.coordinates && (
                        <Marker key={auth.authorityId} position={[auth.location.coordinates[1], auth.location.coordinates[0]]}>
                            <Popup>
                                <div className="p-2 min-w-[150px]">
                                    <h3 className="font-bold text-lg mb-1">{auth.name}</h3>
                                    <p className="text-sm text-gray-600 mb-2">{auth.district}, {auth.state}</p>
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                        <span className="text-xs font-semibold">{auth.incidentsHandled || 0} Incidents</span>
                                        <button onClick={() => navigate(`/authorities/${auth.authorityId}`)} className="btn btn-primary btn-sm py-1 px-2 text-xs">Details</button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
};
export default LAMapView;
