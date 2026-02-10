/**
 * Employee Form Page
 * Create/Edit employee
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import employeeService from '../../services/employee.service.js';
import { useToast } from '../../../../shared/hooks/useToast.jsx';

function EmployeeForm() {
    const { employeeId } = useParams();
    const isEdit = Boolean(employeeId);
    const navigate = useNavigate();
    const { success, error } = useToast();

    console.log('EmployeeForm mounted', { employeeId, isEdit });


    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'FIELD_RESPONDER',
        contact: '', // Normalize field names
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isEdit) {
            loadEmployee();
        }
    }, [employeeId]);

    const loadEmployee = async () => {
        try {
            setLoading(true);
            const employees = await employeeService.getEmployees();
            if (Array.isArray(employees)) {
                const employee = employees.find(e => e.employeeId === employeeId);
                if (employee) {
                    setFormData({
                        name: employee.name || '',
                        email: employee.email || '',
                        phone: employee.contact || employee.phone || '',
                        contact: employee.contact || employee.phone || '',
                        role: employee.role || 'FIELD_RESPONDER',
                    });
                } else {
                    error('Employee not found');
                    navigate('/team');
                }
            }
        } catch (err) {
            console.error(err);
            error('Failed to load employee details');
        } finally {
            setLoading(false);
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
            const data = {
                ...formData,
                contact: formData.phone, // Ensure contact is sent
            };

            if (isEdit) {
                await employeeService.updateEmployee({ ...data, employeeId });
                success('Employee updated successfully');
            } else {
                await employeeService.createEmployee(data);
                success('Employee created successfully');
            }
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
