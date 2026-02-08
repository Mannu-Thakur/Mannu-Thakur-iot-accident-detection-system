/**
 * Navbar Component
 * Top navigation bar with menu toggle, title, and actions
 */

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useTheme } from '../../hooks/useTheme.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import './Navbar.css';

export function Navbar({ title, onMenuClick }) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { toasts } = useToast();
    const [showNotifications, setShowNotifications] = useState(false);

    // Get recent notifications from toasts
    const recentNotifications = toasts.slice(0, 5);

    return (
        <header className="navbar glass-navbar">
            <div className="navbar-left">
                <button className="navbar-btn navbar-menu-btn btn-icon btn-ghost" onClick={onMenuClick}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <path d="M3 12h18M3 6h18M3 18h18" />
                    </svg>
                </button>
                <h1 className="navbar-title">{title}</h1>
            </div>

            <div className="navbar-right">
                {/* Notifications */}
                <div style={{ position: 'relative' }}>
                    <button
                        className="navbar-btn btn-icon btn-ghost"
                        title="Notifications"
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                        </svg>
                        {recentNotifications.length > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: 6,
                                right: 6,
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: 'var(--color-primary)',
                            }} />
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                        <div className="notification-dropdown">
                            <div className="notification-header">
                                <span className="notification-title">Notifications</span>
                            </div>
                            <div className="notification-list">
                                {recentNotifications.length > 0 ? (
                                    recentNotifications.map((n, i) => (
                                        <div key={i} className={`notification-item notification-${n.type}`}>
                                            <span className="notification-message">{n.message}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="notification-empty">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                                            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                                        </svg>
                                        <p>No notifications</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Theme Toggle */}
                <button className="navbar-btn btn-icon btn-ghost" onClick={toggleTheme} title="Toggle theme">
                    {theme === 'dark' ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <circle cx="12" cy="12" r="5" />
                            <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                        </svg>
                    )}
                </button>

                {/* User Info */}
                <div className="navbar-user">
                    <div className="navbar-user-info">
                        <span className="navbar-user-name">{user?.name || 'User'}</span>
                        <span className="navbar-user-email">{user?.email || ''}</span>
                    </div>
                    <button className="navbar-btn btn-icon btn-ghost" onClick={logout} title="Logout">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
}

export default Navbar;
