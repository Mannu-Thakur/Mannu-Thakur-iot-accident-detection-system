/**
 * Assign Team Modal
 * Modal to select and assign employees to an incident
 */

import { useState, useEffect } from 'react';
import employeeService from '../../services/employee.service.js';
import incidentService from '../../services/incident.service.js'; // Assuming assignTask is here or in taskService
import taskService from '../../services/task.service.js'; // Correct place for assignTask
import { useToast } from '../../../../shared/hooks/useToast.jsx';

function AssignTeamModal({ isOpen, onClose, incidentId, onSuccess }) {
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadAvailableEmployees();
        }
    }, [isOpen]);

    const handleClose = () => {
        setClosing(true);
        setTimeout(() => {
            setClosing(false);
            onClose();
        }, 300); // Match animation duration
    };

    const loadAvailableEmployees = async () => {
        try {
            setLoading(true);
            const data = await employeeService.getEmployeesByStatus();
            setEmployees(data.available || []);
        } catch (err) {
            console.error(err);
            error('Failed to load available employees');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleEmployee = (employeeId) => {
        setSelectedEmployees(prev =>
            prev.includes(employeeId)
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedEmployees.length === 0) {
            error('Please select at least one employee');
            return;
        }

        try {
            setSubmitting(true);
            await taskService.assignTask({
                incidentId,
                employeeIds: selectedEmployees,
                priority,
                notes
            });
            success('Team assigned successfully');
            onSuccess();
            handleClose();
        } catch (err) {
            console.error(err);
            error(err.message || 'Failed to assign team');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen && !closing) return null;

    return (
        <div className={`modal-overlay ${closing ? 'closing' : ''}`} onClick={handleClose}>
            <div className="modal-content glass-panel" style={{ maxWidth: '600px', width: '100%' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Assign Rescue Team</h3>
                    <button className="btn-close" onClick={handleClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Available Employees</label>
                            {loading ? (
                                <div className="spinner"></div>
                            ) : employees.length === 0 ? (
                                <p className="text-muted">No employees available</p>
                            ) : (
                                <div className="employee-list" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-sm)' }}>
                                    {employees.map(emp => (
                                        <div key={emp.employeeId} className="flex items-center gap-sm mb-2">
                                            <input
                                                type="checkbox"
                                                id={`emp-${emp.employeeId}`}
                                                checked={selectedEmployees.includes(emp.employeeId)}
                                                onChange={() => handleToggleEmployee(emp.employeeId)}
                                            />
                                            <label htmlFor={`emp-${emp.employeeId}`} className="cursor-pointer flex-1">
                                                <span className="font-medium">{emp.name}</span>
                                                <span className="text-muted text-sm ml-2">({emp.role})</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="form-group mt-4">
                            <label className="form-label">Priority</label>
                            <select
                                className="form-select"
                                value={priority}
                                onChange={(e) => setPriority(Number(e.target.value))}
                            >
                                <option value={1}>Low</option>
                                <option value={2}>Medium</option>
                                <option value={3}>High</option>
                                <option value={4}>Critical</option>
                                <option value={5}>Emergency</option>
                            </select>
                        </div>

                        <div className="form-group mt-4">
                            <label className="form-label">Notes</label>
                            <textarea
                                className="form-input"
                                rows="3"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Instructions for the team..."
                            ></textarea>
                        </div>

                        <div className="modal-footer mt-6 flex justify-end gap-md">
                            <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={submitting || selectedEmployees.length === 0}>
                                {submitting ? <span className="spinner"></span> : 'Assign Team'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AssignTeamModal;
