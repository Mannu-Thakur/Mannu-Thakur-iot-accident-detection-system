import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import stateService from '../../services/state.service.js';
import { useToast } from '../../../../shared/hooks/useToast.jsx';

function AuthorityForm() {
    const { authorityId } = useParams();
    const isEdit = Boolean(authorityId);
    const navigate = useNavigate();
    const { success, error } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        district: '',
        state: '',
        email: '',
        phone: '',
        address: '',
        latitude: '',
        longitude: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);

    useEffect(() => {
        if (isEdit) {
            loadAuthority();
        }
    }, [authorityId]);

    const loadAuthority = async () => {
        try {
            const data = await stateService.getAuthority(authorityId);
            setFormData({
                name: data.name || '',
                code: data.code || '',
                district: data.district || '',
                state: data.state || '',
                email: data.contactEmail || '',
                phone: data.contactPhone || '',
                address: data.address || '',
                latitude: data.location?.coordinates?.[1] || '',
                longitude: data.location?.coordinates?.[0] || '',
                password: '' // Don't load password
            });
        } catch (err) {
            error('Failed to load authority details');
            navigate('/authorities');
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Construct payload matching user requirements
            const lat = parseFloat(formData.latitude || 0);
            const lon = parseFloat(formData.longitude || 0);

            // Generate default 5km jurisdiction box for regionGeoFence
            const delta = 0.05;
            const regionGeoFence = {
                type: "Polygon",
                coordinates: [[
                    [lon - delta, lat - delta],
                    [lon + delta, lat - delta],
                    [lon + delta, lat + delta],
                    [lon - delta, lat + delta],
                    [lon - delta, lat - delta]
                ]]
            };

            const payload = {
                name: formData.name,
                code: formData.code,
                district: formData.district,
                state: formData.state,
                contactEmail: formData.email,
                contactPhone: formData.phone,
                address: formData.address,
                location: {
                    lat: lat,
                    lon: lon
                },
                regionGeoFence: regionGeoFence
            };

            if (formData.password) {
                payload.password = formData.password;
            }

            if (isEdit) {
                await stateService.updateAuthority(authorityId, payload);
                success('Authority updated successfully');
            } else {
                await stateService.createAuthority(payload);
                success('Authority created successfully');
            }
            navigate('/authorities');
        } catch (err) {
            error(err.message || 'Failed to save authority');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-4 flex justify-center"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <button className="btn btn-ghost" onClick={() => navigate('/authorities')}>
                        ← Back
                    </button>
                    <h1 className="page-title" style={{ marginTop: 'var(--spacing-sm)' }}>
                        {isEdit ? 'Edit Authority' : 'Add Authority'}
                    </h1>
                </div>
            </div>

            <div className="card" style={{ maxWidth: 800 }}>
                <form onSubmit={handleSubmit}>
                    {/* Basic Info */}
                    <div className="form-section mb-6">
                        <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                        <div className="form-group mb-3">
                            <label className="form-label">Authority Name *</label>
                            <input
                                name="name"
                                type="text"
                                className="form-input"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g., Pune District Emergency Control"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <label className="form-label">Code *</label>
                                <input
                                    name="code"
                                    type="text"
                                    className="form-input"
                                    value={formData.code}
                                    onChange={handleChange}
                                    placeholder="e.g., LA-PUNE-01"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">District *</label>
                                <input
                                    name="district"
                                    type="text"
                                    className="form-input"
                                    value={formData.district}
                                    onChange={handleChange}
                                    placeholder="e.g., Pune"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group mt-3">
                            <label className="form-label">State</label>
                            <input
                                name="state"
                                type="text"
                                className="form-input"
                                value={formData.state}
                                onChange={handleChange}
                                placeholder="e.g., Maharashtra"
                            />
                            <p className="text-xs text-gray-500 mt-1">Leave empty to use your default state (for SLA users)</p>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="form-section mb-6">
                        <h3 className="text-lg font-semibold mb-3">Location</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <label className="form-label">Latitude *</label>
                                <input
                                    name="latitude"
                                    type="number"
                                    step="any"
                                    className="form-input"
                                    value={formData.latitude}
                                    onChange={handleChange}
                                    placeholder="e.g., 18.52"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Longitude *</label>
                                <input
                                    name="longitude"
                                    type="number"
                                    step="any"
                                    className="form-input"
                                    value={formData.longitude}
                                    onChange={handleChange}
                                    placeholder="e.g., 73.85"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact & Security */}
                    <div className="form-section mb-6">
                        <h3 className="text-lg font-semibold mb-3">Contact & Security</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input
                                    name="email"
                                    type="email"
                                    className="form-input"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="authority@gov.in"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input
                                    name="phone"
                                    type="tel"
                                    className="form-input"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+91 XXXXX XXXXX"
                                />
                            </div>
                        </div>

                        <div className="form-group mt-3">
                            <label className="form-label">Address</label>
                            <textarea
                                name="address"
                                className="form-input"
                                value={formData.address}
                                onChange={handleChange}
                                rows={3}
                                placeholder="Full address of the authority office"
                            />
                        </div>

                        <div className="form-group mt-3">
                            <label className="form-label">{isEdit ? 'New Password (Optional)' : 'Password'}</label>
                            <input
                                name="password"
                                type="password"
                                className="form-input"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder={isEdit ? "Leave blank to keep current" : "SecurePassword123"}
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 mt-6">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <span className="spinner" /> : (isEdit ? 'Update Authority' : 'Create Authority')}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate('/authorities')}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AuthorityForm;
