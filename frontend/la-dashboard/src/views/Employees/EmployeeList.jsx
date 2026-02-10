import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import employeeService from '../../services/employee.service.js';
import { getInitials, formatStatus } from '../../../../shared/utils/formatters.js';
import DeleteConfirmationModal from '../../../../shared/components/UI/DeleteConfirmationModal.jsx';
import { useToast } from '../../../../shared/hooks/useToast.jsx';

function EmployeeList() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ show: false, employeeId: null, name: '' });
    const navigate = useNavigate();
    const { success, error } = useToast();

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            const data = await employeeService.getEmployees({ limit: 100 });
            setEmployees(data || []);
        } catch (err) {
            console.error('Failed to load employees:', err);
            error('Failed to load team list');
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (employee) => {
        setDeleteModal({
            show: true,
            employeeId: employee.employeeId,
            name: employee.name
        });
    };

    const handleDelete = async () => {
        try {
            await employeeService.deleteEmployee(deleteModal.employeeId);
            success('Employee deleted successfully');
            loadEmployees(); // Refresh list
        } catch (err) {
            console.error('Failed to delete employee:', err);
            error(err.message || 'Failed to delete employee');
            throw err; // Re-throw to keep modal open or let handling logic decide (modal catches it in onConfirm)
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
                                            <div className="flex gap-sm">
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => navigate(`/team/${employee.employeeId}`)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm text-danger"
                                                    onClick={() => confirmDelete(employee)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <DeleteConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ ...deleteModal, show: false })}
                onConfirm={handleDelete}
                title="Delete Employee"
                itemName={deleteModal.name}
            />
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
