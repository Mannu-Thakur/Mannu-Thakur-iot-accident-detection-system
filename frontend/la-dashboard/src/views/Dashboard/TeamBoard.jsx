/**
 * Team Board Component
 * Shows team status in columns
 */

import { getInitials } from '../../../../shared/utils/formatters.js';

function TeamBoard({ teamStatus }) {
    const columns = [
        { key: 'available', title: 'Available', items: teamStatus.available },
        { key: 'busy', title: 'On Task', items: teamStatus.busy },
        { key: 'offline', title: 'Offline', items: teamStatus.offline },
    ];

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">Team Status</h3>
            </div>
            <div className="team-board">
                {columns.map(col => (
                    <div key={col.key} className="team-column">
                        <div className="team-column-header">
                            <span className="team-column-title">{col.title}</span>
                            <span className="team-column-count">{col.items.length}</span>
                        </div>
                        {col.items.length === 0 ? (
                            <p className="text-muted text-sm text-center" style={{ padding: '1rem' }}>
                                No members
                            </p>
                        ) : (
                            col.items.map(member => (
                                <div key={member.employeeId} className="team-member">
                                    <div className="avatar avatar-sm">{getInitials(member.name)}</div>
                                    <div className="team-member-info">
                                        <div className="team-member-name truncate">{member.name}</div>
                                        <div className="team-member-role">{member.role}</div>
                                    </div>
                                    {member.isOnline && (
                                        <span style={{ color: 'var(--color-success)', fontSize: '0.5rem' }}>●</span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default TeamBoard;
