import { useState, useEffect } from 'react';
import employeeService from '../../services/employee.service';
import { getInitials, formatStatus } from '../../../../shared/utils/formatters';

function TeamAnalytics() {
    const [employees, setEmployees] = useState([]);
    const [stats, setStats] = useState({ available: 0, busy: 0, offline: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await employeeService.getEmployees({ limit: 100 });
            if (Array.isArray(data)) {
                setEmployees(data);
                setStats({
                    available: data.filter(e => e.status === 'AVAILABLE').length,
                    busy: data.filter(e => e.status === 'BUSY_ON_TASK').length,
                    offline: data.filter(e => ['OFF_DUTY', 'ON_LEAVE', 'INACTIVE'].includes(e.status)).length
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Team Viewer</h1>
                    <p className="page-subtitle">Live status of all rescue units</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-md mb-6">
                <div className="card text-center">
                    <div className="text-2xl font-bold text-success">{stats.available}</div>
                    <div className="text-muted text-sm">Available</div>
                </div>
                <div className="card text-center">
                    <div className="text-2xl font-bold text-warning">{stats.busy}</div>
                    <div className="text-muted text-sm">Busy on Task</div>
                </div>
                <div className="card text-center">
                    <div className="text-2xl font-bold text-gray">{stats.offline}</div>
                    <div className="text-muted text-sm">Offline</div>
                </div>
            </div>

            <div className="card">
                <h3 className="text-lg font-semibold mb-4">Unit Status Grid</h3>
                {loading ? (
                    <div className="flex justify-center p-8"><div className="spinner" /></div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {employees.map(emp => (
                            <div key={emp.employeeId} className={`p-4 rounded-lg border ${emp.status === 'AVAILABLE' ? 'border-success bg-success-light' : emp.status === 'BUSY_ON_TASK' ? 'border-warning bg-warning-light' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="avatar avatar-sm">{getInitials(emp.name)}</div>
                                    <div>
                                        <div className="font-medium">{emp.name}</div>
                                        <div className="text-xs text-muted">{emp.role}</div>
                                    </div>
                                </div>
                                <div className="mt-2 flex justify-between items-center">
                                    <span className={`badge badge-sm badge-${getStatusBadge(emp.status)}`}>
                                        {formatStatus(emp.status)}
                                    </span>
                                    {emp.phone && <span className="text-xs text-muted">📞 {emp.phone}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function getStatusBadge(status) {
    const map = { AVAILABLE: 'success', BUSY_ON_TASK: 'warning', ON_LEAVE: 'gray', OFF_DUTY: 'gray', INACTIVE: 'danger' };
    return map[status] || 'gray';
}

export default TeamAnalytics;
