/**
 * Vehicle List Page for Owner
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ownerService from '../../services/owner.service.js';

function VehicleList() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadVehicles();
    }, []);

    const loadVehicles = async () => {
        try {
            const data = await ownerService.getMyVehicles();
            setVehicles(data);
        } catch (error) {
            console.error('Failed to load vehicles:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">My Vehicles</h1>
                    <p className="page-subtitle">View all your registered vehicles</p>
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div className="flex items-center justify-center" style={{ padding: '3rem' }}>
                        <div className="spinner" />
                    </div>
                ) : vehicles.length === 0 ? (
                    <div className="empty-state">
                        <h4 className="empty-state-title">No vehicles</h4>
                        <p className="empty-state-text">You don't have any vehicles registered.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Registration</th>
                                    <th>Type</th>
                                    <th>Device</th>
                                    <th>Incidents</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vehicles.map(v => (
                                    <tr key={v.vehicleId}>
                                        <td className="font-medium">{v.registrationNo}</td>
                                        <td><span className="vehicle-type">{v.vehicleType}</span></td>
                                        <td>{v.deviceId ? <span className="badge badge-success">Active</span> : <span className="badge badge-gray">None</span>}</td>
                                        <td>{v.incidentCount || 0}</td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/vehicles/${v.vehicleId}`)}>
                                                View Details
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

export default VehicleList;
