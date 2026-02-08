/**
 * Owner Form Page
 * Complete owner registration/edit with nominees and documents
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import rtoService from '../../services/rto.service.js';
import { useToast } from '@shared/hooks/useToast.jsx';

const RELATIONS = ['SPOUSE', 'PARENT', 'SIBLING', 'CHILD', 'FRIEND', 'OTHER'];
const DOC_TYPES = ['AADHAAR', 'PAN', 'DL', 'PASSPORT', 'OTHER'];

const emptyNominee = { name: '', phone: '', relation: '', address: '', isPrimary: false };
const emptyDocument = { type: '', number: '' };

function OwnerForm() {
    const { ownerId } = useParams();
    const isEdit = Boolean(ownerId);
    const navigate = useNavigate();
    const { success, error } = useToast();

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        mobileNumber: '',
        address: '',
    });
    const [nominees, setNominees] = useState([{ ...emptyNominee, isPrimary: true }]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingOwner, setFetchingOwner] = useState(isEdit);

    useEffect(() => {
        if (isEdit) {
            loadOwner();
        }
    }, [ownerId]);

    const loadOwner = async () => {
        try {
            setFetchingOwner(true);
            const owner = await rtoService.getOwner(ownerId);
            setFormData({
                fullName: owner.fullName || '',
                email: owner.email || '',
                mobileNumber: owner.mobileNumber || '',
                address: owner.address || '',
            });
            if (owner.nominees?.length > 0) {
                setNominees(owner.nominees);
            }
            if (owner.documents?.length > 0) {
                setDocuments(owner.documents);
            }
        } catch (err) {
            error('Failed to load owner');
            navigate('/owners');
        } finally {
            setFetchingOwner(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Nominees handlers
    const handleNomineeChange = (index, field, value) => {
        const updated = [...nominees];
        updated[index] = { ...updated[index], [field]: value };

        // If setting primary, unset others
        if (field === 'isPrimary' && value) {
            updated.forEach((n, i) => {
                if (i !== index) n.isPrimary = false;
            });
        }
        setNominees(updated);
    };

    const addNominee = () => {
        if (nominees.length < 5) {
            setNominees([...nominees, { ...emptyNominee }]);
        }
    };

    const removeNominee = (index) => {
        const updated = nominees.filter((_, i) => i !== index);
        // Ensure at least one primary if none selected
        if (updated.length > 0 && !updated.some(n => n.isPrimary)) {
            updated[0].isPrimary = true;
        }
        setNominees(updated);
    };

    // Documents handlers
    const handleDocChange = (index, field, value) => {
        const updated = [...documents];
        updated[index] = { ...updated[index], [field]: value };
        setDocuments(updated);
    };

    const addDocument = () => {
        setDocuments([...documents, { ...emptyDocument }]);
    };

    const removeDocument = (index) => {
        setDocuments(documents.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Filter out empty nominees
        const validNominees = nominees.filter(n => n.name && n.phone);
        const validDocuments = documents.filter(d => d.type && d.number);

        const payload = {
            ...formData,
            nominees: validNominees,
            documents: validDocuments,
        };

        console.log('[OwnerForm] Submitting payload:', payload);

        try {
            if (isEdit) {
                const result = await rtoService.updateOwner(ownerId, payload);
                console.log('[OwnerForm] Update result:', result);
                success('Owner updated successfully');
            } else {
                const result = await rtoService.createOwner(payload);
                console.log('[OwnerForm] Create result:', result);
                success('Owner registered successfully');
            }
            navigate('/owners');
        } catch (err) {
            console.error('[OwnerForm] Error:', err);
            error(err.message || 'Failed to save owner');
        } finally {
            setLoading(false);
        }
    };

    if (fetchingOwner) {
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
                    <button className="btn btn-ghost" onClick={() => navigate('/owners')}>← Back</button>
                    <h1 className="page-title" style={{ marginTop: 'var(--spacing-sm)' }}>
                        {isEdit ? 'Edit Owner' : 'Register Owner'}
                    </h1>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Basic Information */}
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h3 className="detail-section-title">Basic Information</h3>

                    <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input
                            name="fullName"
                            type="text"
                            className="form-input"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder="Enter full name"
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div className="form-group">
                            <label className="form-label">Email *</label>
                            <input
                                name="email"
                                type="email"
                                className="form-input"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="email@example.com"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mobile Number *</label>
                            <input
                                name="mobileNumber"
                                type="tel"
                                className="form-input"
                                value={formData.mobileNumber}
                                onChange={handleChange}
                                placeholder="+91XXXXXXXXXX"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Address</label>
                        <textarea
                            name="address"
                            className="form-input"
                            value={formData.address}
                            onChange={handleChange}
                            rows={2}
                            placeholder="Enter complete address"
                        />
                    </div>
                </div>

                {/* Nominees Section */}
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-md)' }}>
                        <h3 className="detail-section-title" style={{ margin: 0 }}>
                            Emergency Contacts (Nominees)
                        </h3>
                        {nominees.length < 5 && (
                            <button type="button" className="btn btn-secondary btn-sm" onClick={addNominee}>
                                + Add Nominee
                            </button>
                        )}
                    </div>
                    <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)', fontSize: '0.875rem' }}>
                        Add up to 5 emergency contacts. These will be notified during incidents.
                    </p>

                    {nominees.map((nominee, index) => (
                        <div key={index} className="nominee-card" style={{
                            padding: 'var(--spacing-md)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--spacing-md)',
                            background: nominee.isPrimary ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                        }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-sm)' }}>
                                <div className="flex items-center gap-sm">
                                    <span style={{ fontWeight: 600 }}>Nominee {index + 1}</span>
                                    {nominee.isPrimary && (
                                        <span className="badge badge-primary">Primary</span>
                                    )}
                                </div>
                                {nominees.length > 1 && (
                                    <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => removeNominee(index)}>
                                        Remove
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                <div className="form-group" style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    <label className="form-label">Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={nominee.name}
                                        onChange={(e) => handleNomineeChange(index, 'name', e.target.value)}
                                        placeholder="Nominee name"
                                        required={index === 0}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    <label className="form-label">Phone *</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={nominee.phone}
                                        onChange={(e) => handleNomineeChange(index, 'phone', e.target.value)}
                                        placeholder="+91XXXXXXXXXX"
                                        required={index === 0}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--spacing-md)', alignItems: 'end' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Relation</label>
                                    <select
                                        className="form-input form-select"
                                        value={nominee.relation}
                                        onChange={(e) => handleNomineeChange(index, 'relation', e.target.value)}
                                    >
                                        <option value="">Select relation...</option>
                                        {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Address</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={nominee.address || ''}
                                        onChange={(e) => handleNomineeChange(index, 'address', e.target.value)}
                                        placeholder="Optional"
                                    />
                                </div>
                                <label className="flex items-center gap-sm" style={{ cursor: 'pointer', padding: 'var(--spacing-sm)' }}>
                                    <input
                                        type="checkbox"
                                        checked={nominee.isPrimary}
                                        onChange={(e) => handleNomineeChange(index, 'isPrimary', e.target.checked)}
                                    />
                                    <span style={{ fontSize: '0.875rem' }}>Primary</span>
                                </label>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Documents Section */}
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-md)' }}>
                        <h3 className="detail-section-title" style={{ margin: 0 }}>
                            Documents (Optional)
                        </h3>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={addDocument}>
                            + Add Document
                        </button>
                    </div>

                    {documents.length === 0 ? (
                        <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                            No documents added. Click "Add Document" to add KYC documents.
                        </p>
                    ) : (
                        documents.map((doc, index) => (
                            <div key={index} style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr auto',
                                gap: 'var(--spacing-md)',
                                alignItems: 'end',
                                marginBottom: 'var(--spacing-md)'
                            }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Document Type</label>
                                    <select
                                        className="form-input form-select"
                                        value={doc.type}
                                        onChange={(e) => handleDocChange(index, 'type', e.target.value)}
                                    >
                                        <option value="">Select type...</option>
                                        {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Document Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={doc.number}
                                        onChange={(e) => handleDocChange(index, 'number', e.target.value)}
                                        placeholder="Enter document number"
                                    />
                                </div>
                                <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => removeDocument(index)}>
                                    Remove
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Submit */}
                <div className="flex gap-md">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <span className="spinner" /> : (isEdit ? 'Update Owner' : 'Register Owner')}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/owners')}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default OwnerForm;
