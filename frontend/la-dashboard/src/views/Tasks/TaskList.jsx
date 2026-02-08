/**
 * Task List Page
 */

import { useState, useEffect } from 'react';
import taskService from '../../services/task.service.js';
import { formatRelativeTime, formatStatus, getInitials } from '../../../../shared/utils/formatters.js';

function TaskList() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            setLoading(true);
            const data = await taskService.getTasks({ limit: 50 });
            setTasks(data);
        } catch (error) {
            console.error('Failed to load tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Tasks</h1>
                    <p className="page-subtitle">Track and manage rescue tasks</p>
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div className="flex items-center justify-center" style={{ padding: '3rem' }}>
                        <div className="spinner" />
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="empty-state">
                        <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9 11l3 3L22 4" />
                            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                        </svg>
                        <h4 className="empty-state-title">No tasks</h4>
                        <p className="empty-state-text">Tasks are created when incidents are assigned to team members.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Task ID</th>
                                    <th>Incident</th>
                                    <th>Assigned To</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map(task => (
                                    <tr key={task.taskId}>
                                        <td className="font-medium">{task.taskId}</td>
                                        <td>{task.incidentId}</td>
                                        <td>
                                            <div className="flex items-center gap-sm">
                                                <div className="avatar avatar-sm">
                                                    {getInitials(task.assignedEmployee?.name || 'U')}
                                                </div>
                                                <span>{task.assignedEmployee?.name || 'Unassigned'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${getStatusBadge(task.status)}`}>
                                                {formatStatus(task.status)}
                                            </span>
                                        </td>
                                        <td className="text-muted">
                                            {formatRelativeTime(task.createdAt)}
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
        PENDING: 'warning',
        IN_PROGRESS: 'primary',
        EN_ROUTE: 'primary',
        ON_SCENE: 'primary',
        COMPLETED: 'success',
        CANCELLED: 'gray',
    };
    return map[status] || 'gray';
}

export default TaskList;
