/**
 * Employee List Page
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import employeeService from '../../services/employee.service.js';
import { getInitials, formatStatus } from '../../../../shared/utils/formatters.js';

function EmployeeList() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            const data = await employeeService.getEmployees({ limit: 100 });
            setEmployees(data);
        } catch (error) {
            console.error('Failed to load employees:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Team Management</h1>
                    <p className="page-subtitle">Manage your rescue team members</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/team/new')}>
                    + Add Employee
                </button>
            </div>

            <div className="card">
                {loading ? (
                    <div className="flex items-center justify-center" style={{ padding: '3rem' }}>
                        <div className="spinner" />
                    </div>
                ) : employees.length === 0 ? (
                    <div className="empty-state">
                        <h4 className="empty-state-title">No team members</h4>
                        <p className="empty-state-text">Add your first team member to get started.</p>
                        <button className="btn btn-primary" onClick={() => navigate('/team/new')}>
                            Add Employee
                        </button>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Phone</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(employee => (
                                    <tr key={employee.employeeId}>
                                        <td>
                                            <div className="flex items-center gap-sm">
                                                <div className="avatar avatar-sm">{getInitials(employee.name)}</div>
                                                <div>
                                                    <div className="font-medium">{employee.name}</div>
                                                    <div className="text-sm text-muted">{employee.employeeId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{employee.role}</td>
                                        <td>
                                            <span className={`badge badge-${getStatusBadge(employee.status)}`}>
                                                {formatStatus(employee.status)}
                                            </span>
                                        </td>
                                        <td>{employee.phone || '-'}</td>
                                        <td>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => navigate(`/team/${employee.employeeId}`)}
                                            >
                                                Edit
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

function getStatusBadge(status) {
    const map = {
        AVAILABLE: 'success',
        BUSY_ON_TASK: 'warning',
        ON_LEAVE: 'gray',
        OFF_DUTY: 'gray',
        INACTIVE: 'danger',
    };
    return map[status] || 'gray';
}

export default EmployeeList;
