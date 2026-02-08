/**
 * Settings Page
 */

import { useState } from 'react';
import { useTheme } from '../../../../shared/hooks/useTheme.jsx';
import { useAuth } from '../../../../shared/hooks/useAuth.jsx';
import { useToast } from '../../../../shared/hooks/useToast.jsx';

function Settings() {
    const { theme, toggleTheme } = useTheme();
    const { user, profile } = useAuth();
    const { success } = useToast();
    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: 'General' },
        { id: 'appearance', label: 'Appearance' },
        { id: 'notifications', label: 'Notifications' },
        { id: 'profile', label: 'Profile' },
    ];

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">Configure your dashboard preferences</p>
                </div>
            </div>

            <div className="card">
                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: 'var(--spacing-lg)'
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`btn btn-ghost ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                borderRadius: 0,
                                borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                                marginBottom: '-1px',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* General Tab */}
                {activeTab === 'general' && (
                    <div>
                        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>General Settings</h3>
                        <div className="form-group">
                            <label className="form-label">Language</label>
                            <select className="form-input form-select" style={{ maxWidth: 300 }}>
                                <option value="en">English</option>
                                <option value="hi">Hindi</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Timezone</label>
                            <select className="form-input form-select" style={{ maxWidth: 300 }}>
                                <option value="Asia/Kolkata">India Standard Time (IST)</option>
                                <option value="UTC">UTC</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Appearance Tab */}
                {activeTab === 'appearance' && (
                    <div>
                        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Appearance</h3>
                        <div className="form-group">
                            <label className="form-label">Theme</label>
                            <div className="flex gap-md">
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-sm)',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="radio"
                                        name="theme"
                                        checked={theme === 'light'}
                                        onChange={() => theme !== 'light' && toggleTheme()}
                                    />
                                    Light
                                </label>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-sm)',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="radio"
                                        name="theme"
                                        checked={theme === 'dark'}
                                        onChange={() => theme !== 'dark' && toggleTheme()}
                                    />
                                    Dark
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                    <div>
                        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Notification Preferences</h3>
                        <div className="form-group">
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-sm)',
                                cursor: 'pointer'
                            }}>
                                <input type="checkbox" defaultChecked />
                                <span>Email notifications for critical incidents</span>
                            </label>
                        </div>
                        <div className="form-group">
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-sm)',
                                cursor: 'pointer'
                            }}>
                                <input type="checkbox" defaultChecked />
                                <span>Browser push notifications</span>
                            </label>
                        </div>
                        <div className="form-group">
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-sm)',
                                cursor: 'pointer'
                            }}>
                                <input type="checkbox" defaultChecked />
                                <span>Sound alerts for new incidents</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div>
                        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Profile Information</h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: 'var(--spacing-lg)',
                            maxWidth: 600
                        }}>
                            <div>
                                <label className="text-muted text-sm">Name</label>
                                <p className="font-medium">{user?.name || profile?.name || '-'}</p>
                            </div>
                            <div>
                                <label className="text-muted text-sm">Email</label>
                                <p className="font-medium">{user?.email || '-'}</p>
                            </div>
                            <div>
                                <label className="text-muted text-sm">Role</label>
                                <p className="font-medium">{user?.role || '-'}</p>
                            </div>
                            <div>
                                <label className="text-muted text-sm">Authority</label>
                                <p className="font-medium">{profile?.name || '-'}</p>
                            </div>
                        </div>
                        <div className="divider" />
                        <button className="btn btn-secondary" onClick={() => success('Password reset email sent')}>
                            Change Password
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Settings;
