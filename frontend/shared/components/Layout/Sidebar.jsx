/**
 * Sidebar Component
 * Navigation sidebar with glassmorphism effect
 */

import { NavLink } from 'react-router-dom';
import './Sidebar.css';

export function Sidebar({ items, collapsed = false, onToggle, mobileOpen = false }) {
    return (
        <aside className={`sidebar glass-sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-open' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                    {!collapsed && <span className="sidebar-brand">Perseva</span>}
                </div>
                <button className="sidebar-toggle btn-icon btn-ghost" onClick={onToggle}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        {collapsed ? (
                            <path d="M9 18l6-6-6-6" />
                        ) : (
                            <path d="M15 18l-6-6 6-6" />
                        )}
                    </svg>
                </button>
            </div>

            <nav className="sidebar-nav">
                {items.map((section, idx) => (
                    <div key={idx} className="sidebar-section">
                        {section.title && !collapsed && (
                            <h6 className="sidebar-section-title">{section.title}</h6>
                        )}
                        <ul className="sidebar-menu">
                            {section.items.map((item) => (
                                <li key={item.path}>
                                    <NavLink
                                        to={item.path}
                                        end
                                        className={({ isActive }) =>
                                            `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                                        }
                                        title={collapsed ? item.label : undefined}
                                    >
                                        <span className="sidebar-icon">{item.icon}</span>
                                        {!collapsed && <span className="sidebar-label">{item.label}</span>}
                                        {!collapsed && item.badge && (
                                            <span className={`sidebar-badge badge badge-${item.badgeType || 'primary'}`}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>
        </aside>
    );
}

export default Sidebar;
