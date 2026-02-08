/**
 * Settings Page for RTO Dashboard
 * Modern UI with comprehensive profile display
 */

import { useState } from 'react';
import { useTheme } from '@shared/hooks/useTheme.jsx';
import { useAuth } from '@shared/hooks/useAuth.jsx';

function Settings() {
    const { theme, toggleTheme } = useTheme();
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    // Merge user and profile data for display
    const userData = { ...user, ...profile };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="text-muted">Manage your profile and preferences</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 'var(--spacing-lg)' }}>
                {['profile', 'appearance', 'account'].map(tab => (
                    <button
                        key={tab}
                        className={`tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Profile Information</h3>
                    </div>

                    {/* Profile Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-lg)',
                        marginBottom: 'var(--spacing-xl)',
                        paddingBottom: 'var(--spacing-lg)',
                        borderBottom: '1px solid var(--border-color)'
                    }}>
                        <div className="avatar avatar-lg" style={{
                            width: 80,
                            height: 80,
                            fontSize: '1.75rem',
                            background: 'var(--color-primary-light)',
                            color: 'var(--color-primary)'
                        }}>
                            {userData?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                        </div>
                        <div>
                            <h2 style={{ margin: 0, marginBottom: 4 }}>{userData?.name || 'User'}</h2>
                            <p className="text-muted" style={{ margin: 0 }}>{userData?.email || '-'}</p>
                            <span className="badge badge-primary" style={{ marginTop: 8 }}>
                                {userData?.role || userData?.roles?.join(', ') || 'RTO'}
                            </span>
                        </div>
                    </div>

                    {/* Profile Details Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: 'var(--spacing-lg)'
                    }}>
                        <div className="info-item">
                            <div className="info-label">Name</div>
                            <div className="info-value">{userData?.name || '-'}</div>
                        </div>
                        <div className="info-item">
                            <div className="info-label">Email</div>
                            <div className="info-value">{userData?.email || '-'}</div>
                        </div>
                        <div className="info-item">
                            <div className="info-label">Role</div>
                            <div className="info-value">{userData?.role || userData?.roles?.join(', ') || '-'}</div>
                        </div>
                        <div className="info-item">
                            <div className="info-label">RTO ID</div>
                            <div className="info-value" style={{ fontFamily: 'monospace' }}>{userData?.rtoId || '-'}</div>
                        </div>
                        <div className="info-item">
                            <div className="info-label">Region</div>
                            <div className="info-value">{userData?.region || '-'}</div>
                        </div>
                        <div className="info-item">
                            <div className="info-label">Jurisdiction</div>
                            <div className="info-value">{userData?.jurisdiction || '-'}</div>
                        </div>
                        <div className="info-item" style={{ gridColumn: 'span 2' }}>
                            <div className="info-label">Office Address</div>
                            <div className="info-value">{userData?.officeAddress || '-'}</div>
                        </div>
                        <div className="info-item">
                            <div className="info-label">Contact Number</div>
                            <div className="info-value">{userData?.contactNumber || userData?.phone || '-'}</div>
                        </div>
                        <div className="info-item">
                            <div className="info-label">User ID</div>
                            <div className="info-value" style={{ fontFamily: 'monospace' }}>{userData?.userId || userData?._id || '-'}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Appearance Settings</h3>
                    </div>

                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <label className="form-label" style={{ marginBottom: 'var(--spacing-md)' }}>Theme</label>
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                            <button
                                className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => theme !== 'light' && toggleTheme()}
                                style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                    <circle cx="12" cy="12" r="5" />
                                    <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                                </svg>
                                Light Mode
                            </button>
                            <button
                                className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => theme !== 'dark' && toggleTheme()}
                                style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                                </svg>
                                Dark Mode
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Account Settings</h3>
                    </div>

                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Change Password</h4>
                        <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                            Update your password to keep your account secure.
                        </p>
                        <button className="btn btn-secondary" disabled>
                            Change Password (Coming Soon)
                        </button>
                    </div>

                    <div style={{
                        paddingTop: 'var(--spacing-lg)',
                        borderTop: '1px solid var(--border-color)'
                    }}>
                        <h4 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-danger)' }}>Danger Zone</h4>
                        <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                            Permanently delete your account and all associated data.
                        </p>
                        <button className="btn btn-danger" disabled>
                            Delete Account (Coming Soon)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Settings;
