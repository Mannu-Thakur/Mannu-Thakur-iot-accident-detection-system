/**
 * Vehicle Form Page
 * Complete vehicle registration/edit with all schema fields
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import rtoService from '../../services/rto.service.js';
import { useToast } from '@shared/hooks/useToast.jsx';

const VEHICLE_TYPES = ['CAR', 'TRUCK', 'BIKE', 'BUS', 'AUTO', 'OTHER'];
const FUEL_TYPES = ['PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID', 'OTHER'];

function VehicleForm() {
    const { vehicleId } = useParams();
    const isEdit = Boolean(vehicleId);
    const navigate = useNavigate();
    const { success, error } = useToast();

    const [formData, setFormData] = useState({
        // Basic info
        registrationNo: '',
        chassisNo: '',
        engineNo: '',
        // Specs
        vehicleType: 'CAR',
        fuelType: 'PETROL',
        model: '',
        manufacturer: '',
        manufacturingYear: new Date().getFullYear(),
        color: '',
        seatingCapacity: 4,
        // Owner & Device
        ownerId: '',
        deviceId: '',
        // Insurance
        insuranceProvider: '',
        insurancePolicyNo: '',
        insuranceExpiryDate: '',
        // Registration dates
        registrationDate: new Date().toISOString().split('T')[0],
        registrationExpiryDate: '',
    });

    const [owners, setOwners] = useState([]);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);

    useEffect(() => {
        loadInitialData();
    }, [vehicleId]);

    const loadInitialData = async () => {
        try {
            setFetchingData(true);

            // Load owners for dropdown
            const ownersRes = await rtoService.getOwners({ limit: 100 });
            setOwners(ownersRes.data || ownersRes);

            // TODO: Load available devices when API is available
            // const devicesRes = await rtoService.getAvailableDevices();
            // setDevices(devicesRes.data || []);

            // If editing, load vehicle data
            if (isEdit) {
                const vehicle = await rtoService.getVehicle(vehicleId);
                setFormData({
                    registrationNo: vehicle.registrationNo || '',
                    chassisNo: vehicle.chassisNo || '',
                    engineNo: vehicle.engineNo || '',
                    vehicleType: vehicle.vehicleType || 'CAR',
                    fuelType: vehicle.fuelType || 'PETROL',
                    model: vehicle.model || '',
                    manufacturer: vehicle.manufacturer || '',
                    manufacturingYear: vehicle.manufacturingYear || new Date().getFullYear(),
                    color: vehicle.color || '',
                    seatingCapacity: vehicle.seatingCapacity || 4,
                    ownerId: vehicle.currentOwnerId || '',
                    deviceId: vehicle.deviceId || '',
                    insuranceProvider: vehicle.insuranceProvider || '',
                    insurancePolicyNo: vehicle.insurancePolicyNo || '',
                    insuranceExpiryDate: vehicle.insuranceExpiryDate?.split('T')[0] || '',
                    registrationDate: vehicle.registrationDate?.split('T')[0] || '',
                    registrationExpiryDate: vehicle.registrationExpiryDate?.split('T')[0] || '',
                });
            }
        } catch (err) {
            console.error('Failed to load data:', err);
            if (isEdit) {
                error('Failed to load vehicle');
                navigate('/vehicles');
            }
        } finally {
            setFetchingData(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Build payload with only non-empty values
        const payload = {};
        Object.entries(formData).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined) {
                payload[key] = value;
            }
        });

        try {
            if (isEdit) {
                await rtoService.updateVehicle(vehicleId, payload);
                success('Vehicle updated successfully');
            } else {
                await rtoService.registerVehicle(payload);
                success('Vehicle registered successfully');
            }
            navigate('/vehicles');
        } catch (err) {
            error(err.message || 'Failed to save vehicle');
        } finally {
            setLoading(false);
        }
    };

    if (fetchingData) {
        return (
            <div className="flex items-center justify-center" style={{ height: 400 }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <button className="btn btn-ghost" onClick={() => navigate('/vehicles')}>← Back</button>
                    <h1 className="page-title" style={{ marginTop: 'var(--spacing-sm)' }}>
                        {isEdit ? 'Edit Vehicle' : 'Register Vehicle'}
                    </h1>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Basic Information */}
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h3 className="detail-section-title">Basic Information</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)' }}>
                        <div className="form-group">
                            <label className="form-label">Registration Number *</label>
                            <input
                                name="registrationNo"
                                type="text"
                                className="form-input"
                                value={formData.registrationNo}
                                onChange={handleChange}
                                placeholder="MH12AB1234"
                                required
                                disabled={isEdit}
                                style={{ textTransform: 'uppercase' }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Chassis Number *</label>
                            <input
                                name="chassisNo"
                                type="text"
                                className="form-input"
                                value={formData.chassisNo}
                                onChange={handleChange}
                                placeholder="Enter chassis number"
                                required
                                disabled={isEdit}
                                style={{ textTransform: 'uppercase' }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Engine Number</label>
                            <input
                                name="engineNo"
                                type="text"
                                className="form-input"
                                value={formData.engineNo}
                                onChange={handleChange}
                                placeholder="Enter engine number"
                                style={{ textTransform: 'uppercase' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Vehicle Specifications */}
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h3 className="detail-section-title">Vehicle Specifications</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)' }}>
                        <div className="form-group">
                            <label className="form-label">Vehicle Type *</label>
                            <select
                                name="vehicleType"
                                className="form-input form-select"
                                value={formData.vehicleType}
                                onChange={handleChange}
                                required
                            >
                                {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Fuel Type</label>
                            <select
                                name="fuelType"
                                className="form-input form-select"
                                value={formData.fuelType}
                                onChange={handleChange}
                            >
                                {FUEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Color</label>
                            <input
                                name="color"
                                type="text"
                                className="form-input"
                                value={formData.color}
                                onChange={handleChange}
                                placeholder="e.g., White, Black"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)' }}>
                        <div className="form-group">
                            <label className="form-label">Manufacturer</label>
                            <input
                                name="manufacturer"
                                type="text"
                                className="form-input"
                                value={formData.manufacturer}
                                onChange={handleChange}
                                placeholder="e.g., Maruti Suzuki"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Model</label>
                            <input
                                name="model"
                                type="text"
                                className="form-input"
                                value={formData.model}
                                onChange={handleChange}
                                placeholder="e.g., Swift"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Manufacturing Year</label>
                            <input
                                name="manufacturingYear"
                                type="number"
                                className="form-input"
                                value={formData.manufacturingYear}
                                onChange={handleChange}
                                min="1900"
                                max={new Date().getFullYear() + 1}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Seating Capacity</label>
                            <input
                                name="seatingCapacity"
                                type="number"
                                className="form-input"
                                value={formData.seatingCapacity}
                                onChange={handleChange}
                                min="1"
                                max="100"
                            />
                        </div>
                    </div>
                </div>

                {/* Owner & Device */}
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h3 className="detail-section-title">Owner & Device</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div className="form-group">
                            <label className="form-label">Owner *</label>
                            <select
                                name="ownerId"
                                className="form-input form-select"
                                value={formData.ownerId}
                                onChange={handleChange}
                                required
                                disabled={isEdit}
                            >
                                <option value="">Select owner...</option>
                                {owners.map(o => (
                                    <option key={o.ownerId} value={o.ownerId}>
                                        {o.fullName} ({o.ownerId})
                                    </option>
                                ))}
                            </select>
                            {!isEdit && (
                                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                                    Don't see the owner? <button type="button" className="btn-link" onClick={() => navigate('/owners/new')}>Register new owner first</button>
                                </p>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Device Serial Number</label>
                            <input
                                name="deviceSerialNo"
                                type="text"
                                className="form-input"
                                value={formData.deviceSerialNo || ''}
                                onChange={handleChange}
                                placeholder="e.g., PERSEVA-12345678"
                            />
                            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                                Use device serial number instead of device ID
                            </p>
                        </div>
                    </div>
                </div>

                {/* Insurance */}
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h3 className="detail-section-title">Insurance (Optional)</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)' }}>
                        <div className="form-group">
                            <label className="form-label">Insurance Provider</label>
                            <input
                                name="insuranceProvider"
                                type="text"
                                className="form-input"
                                value={formData.insuranceProvider}
                                onChange={handleChange}
                                placeholder="e.g., ICICI Lombard"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Policy Number</label>
                            <input
                                name="insurancePolicyNo"
                                type="text"
                                className="form-input"
                                value={formData.insurancePolicyNo}
                                onChange={handleChange}
                                placeholder="Policy number"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Expiry Date</label>
                            <input
                                name="insuranceExpiryDate"
                                type="date"
                                className="form-input"
                                value={formData.insuranceExpiryDate}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Registration Dates */}
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h3 className="detail-section-title">Registration</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div className="form-group">
                            <label className="form-label">Registration Date</label>
                            <input
                                name="registrationDate"
                                type="date"
                                className="form-input"
                                value={formData.registrationDate}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Registration Expiry Date</label>
                            <input
                                name="registrationExpiryDate"
                                type="date"
                                className="form-input"
                                value={formData.registrationExpiryDate}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex gap-md">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <span className="spinner" /> : (isEdit ? 'Update Vehicle' : 'Register Vehicle')}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/vehicles')}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default VehicleForm;
