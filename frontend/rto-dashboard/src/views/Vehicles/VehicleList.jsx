/**
 * Vehicle List Page
 * Enhanced vehicle listing with search, filters, pagination, and actions
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import rtoService from '../../services/rto.service.js';
import { formatDate } from '@shared/utils/formatters.js';
import Pagination from '@shared/components/UI/Pagination.jsx';

const VEHICLE_TYPES = ['ALL', 'CAR', 'TRUCK', 'BIKE', 'BUS', 'AUTO', 'OTHER'];
const DEVICE_FILTER = ['ALL', 'BOUND', 'UNBOUND'];

function VehicleList() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [vehicleType, setVehicleType] = useState('ALL');
    const [deviceFilter, setDeviceFilter] = useState('ALL');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const navigate = useNavigate();

    useEffect(() => {
        loadVehicles();
    }, [pagination.page, search, vehicleType, deviceFilter]);

    const loadVehicles = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
            };
            if (search) params.search = search;
            if (vehicleType !== 'ALL') params.vehicleType = vehicleType;
            if (deviceFilter === 'BOUND') params.hasDevice = true;
            if (deviceFilter === 'UNBOUND') params.hasDevice = false;

            const response = await rtoService.getVehicles(params);
            setVehicles(response.data || response);
            if (response.pagination) {
                setPagination(prev => ({ ...prev, ...response.pagination }));
            }
        } catch (error) {
            console.error('Failed to load vehicles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE': return 'active';
            case 'TRANSFER_PENDING': return 'warning';
            case 'SUSPENDED': return 'danger';
            case 'SCRAPPED': return 'inactive';
            default: return 'active';
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Vehicles</h1>
                    <p className="text-muted">Manage registered vehicles and device bindings</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/vehicles/new')}>
                    + Register Vehicle
                </button>
            </div>

            {/* Search and Filters */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div className="flex items-center gap-md flex-wrap">
                    <div style={{ flex: 1, minWidth: 250, position: 'relative' }}>
                        <svg
                            viewBox="0 0 24 24"
                            style={{
                                position: 'absolute',
                                left: 12,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 20,
                                height: 20,
                                stroke: 'var(--text-muted)',
                                fill: 'none',
                                strokeWidth: 2
                            }}
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search by registration, model, manufacturer..."
                            value={search}
                            onChange={handleSearch}
                            style={{ paddingLeft: 44 }}
                        />
                    </div>

                    <select
                        className="form-input form-select"
                        value={vehicleType}
                        onChange={(e) => { setVehicleType(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        style={{ width: 150 }}
                    >
                        {VEHICLE_TYPES.map(t => (
                            <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>
                        ))}
                    </select>

                    <select
                        className="form-input form-select"
                        value={deviceFilter}
                        onChange={(e) => { setDeviceFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        style={{ width: 150 }}
                    >
                        {DEVICE_FILTER.map(f => (
                            <option key={f} value={f}>
                                {f === 'ALL' ? 'All Devices' : f === 'BOUND' ? 'Device Bound' : 'No Device'}
                            </option>
                        ))}
                    </select>

                    <span className="text-muted">
                        {pagination.total} vehicles
                    </span>
                </div>
            </div>

            {/* Vehicles Table */}
            <div className="card">
                {loading ? (
                    <div className="flex items-center justify-center" style={{ padding: '3rem' }}>
                        <div className="spinner" style={{ width: 32, height: 32 }} />
                    </div>
                ) : vehicles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <h3>No vehicles found</h3>
                        <p className="text-muted">
                            {search || vehicleType !== 'ALL' || deviceFilter !== 'ALL'
                                ? 'Try adjusting your filters'
                                : 'Register your first vehicle to get started'}
                        </p>
                    </div>
                ) : (
                    <>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Vehicle</th>
                                    <th>Owner</th>
                                    <th>Type</th>
                                    <th>Device</th>
                                    <th>Registered</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vehicles.map(vehicle => (
                                    <tr
                                        key={vehicle.vehicleId}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => navigate(`/vehicles/${vehicle.vehicleId}`)}
                                    >
                                        <td>
                                            <div>
                                                <div style={{ fontWeight: 600, letterSpacing: 1 }}>{vehicle.registrationNo}</div>
                                                <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                    {vehicle.manufacturer} {vehicle.model}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="text-muted">{vehicle.currentOwnerId}</div>
                                        </td>
                                        <td>
                                            <span className="badge">{vehicle.vehicleType}</span>
                                        </td>
                                        <td>
                                            {vehicle.deviceId ? (
                                                <span className="status-indicator status-active" title={vehicle.deviceId}>
                                                    {vehicle.deviceId.substring(0, 12)}...
                                                </span>
                                            ) : (
                                                <span className="text-muted">Not bound</span>
                                            )}
                                        </td>
                                        <td>{formatDate(vehicle.createdAt)}</td>
                                        <td>
                                            <span className={`status-indicator status-${getStatusColor(vehicle.status || 'ACTIVE')}`}>
                                                {vehicle.status || 'ACTIVE'}
                                            </span>
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div className="flex gap-sm">
                                                <Link to={`/vehicles/${vehicle.vehicleId}`} className="btn btn-ghost btn-sm">
                                                    View
                                                </Link>
                                                <Link to={`/vehicles/${vehicle.vehicleId}/edit`} className="btn btn-ghost btn-sm">
                                                    Edit
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ padding: 'var(--spacing-md)', borderTop: '1px solid var(--border-color)' }}>
                            <Pagination
                                currentPage={pagination.page}
                                totalPages={pagination.totalPages}
                                onPageChange={handlePageChange}
                            />
                        </div>

                    </>
                )}
            </div>
        </div>
    );
}

export default VehicleList;
