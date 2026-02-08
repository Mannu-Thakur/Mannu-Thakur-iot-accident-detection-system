/**
 * Employee Form Page
 * Create/Edit employee
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import employeeService from '../../services/employee.service.js';
import { useToast } from '../../../../shared/hooks/useToast.jsx';

function EmployeeForm() {
    const { employeeId } = useParams();
    const isEdit = Boolean(employeeId);
    const navigate = useNavigate();
    const { success, error } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'FIELD_RESPONDER',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await employeeService.createEmployee(formData);
            success('Employee created successfully');
            navigate('/team');
        } catch (err) {
            error(err.message || 'Failed to save employee');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <button className="btn btn-ghost" onClick={() => navigate('/team')}>
                        ← Back
                    </button>
                    <h1 className="page-title" style={{ marginTop: 'var(--spacing-sm)' }}>
                        {isEdit ? 'Edit Employee' : 'Add Employee'}
                    </h1>
                </div>
            </div>

            <div className="card" style={{ maxWidth: 600 }}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="name">Full Name *</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            className="form-input"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email *</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            className="form-input"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="phone">Phone</label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            className="form-input"
                            value={formData.phone}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="role">Role *</label>
                        <select
                            id="role"
                            name="role"
                            className="form-input form-select"
                            value={formData.role}
                            onChange={handleChange}
                            required
                        >
                            <option value="FIELD_RESPONDER">Field Responder</option>
                            <option value="PARAMEDIC">Paramedic</option>
                            <option value="DRIVER">Driver</option>
                            <option value="COORDINATOR">Coordinator</option>
                            <option value="SUPERVISOR">Supervisor</option>
                        </select>
                    </div>

                    <div className="flex gap-md" style={{ marginTop: 'var(--spacing-xl)' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <span className="spinner" /> : (isEdit ? 'Update' : 'Create')}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate('/team')}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EmployeeForm;
