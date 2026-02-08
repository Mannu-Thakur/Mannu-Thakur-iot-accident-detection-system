/**
 * Stats Cards Component
 * Dashboard stat cards with icons
 */

function StatsCards({ stats }) {
    return (
        <div className="stats-grid">
            <div className="card stat-card">
                <div className="stat-icon stat-icon-primary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <path d="M12 9v4M12 17h.01" />
                    </svg>
                </div>
                <div className="stat-content">
                    <div className="stat-label">Total Incidents</div>
                    <div className="stat-value">{stats.total}</div>
                </div>
            </div>

            <div className="card stat-card">
                <div className="stat-icon stat-icon-warning">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                    </svg>
                </div>
                <div className="stat-content">
                    <div className="stat-label">Today</div>
                    <div className="stat-value">{stats.today}</div>
                </div>
            </div>

            <div className="card stat-card">
                <div className="stat-icon stat-icon-danger">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                </div>
                <div className="stat-content">
                    <div className="stat-label">Critical</div>
                    <div className="stat-value">{stats.critical}</div>
                </div>
            </div>

            <div className="card stat-card">
                <div className="stat-icon stat-icon-success">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <path d="M22 4L12 14.01l-3-3" />
                    </svg>
                </div>
                <div className="stat-content">
                    <div className="stat-label">Resolved</div>
                    <div className="stat-value">{stats.resolved}</div>
                </div>
            </div>
        </div>
    );
}

export default StatsCards;
