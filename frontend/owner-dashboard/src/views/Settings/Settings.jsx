/**
 * Settings Page for Owner Dashboard
 */

import { useState } from 'react';
import { useTheme } from '../../../../shared/hooks/useTheme.jsx';
import { useAuth } from '../../../../shared/hooks/useAuth.jsx';

function Settings() {
    const { theme, toggleTheme } = useTheme();
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">Manage your account settings</p>
                </div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: 'var(--spacing-lg)' }}>
                    {['profile', 'appearance', 'nominees'].map(tab => (
                        <button
                            key={tab}
                            className="btn btn-ghost"
                            onClick={() => setActiveTab(tab)}
                            style={{ borderRadius: 0, borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent', marginBottom: '-1px' }}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {activeTab === 'profile' && (
                    <div>
                        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Profile Information</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-lg)', maxWidth: 500 }}>
                            <div>
                                <label className="text-muted text-sm">Name</label>
                                <p className="font-medium">{user?.name || profile?.name || '-'}</p>
                            </div>
                            <div>
                                <label className="text-muted text-sm">Email</label>
                                <p className="font-medium">{user?.email || '-'}</p>
                            </div>
                            <div>
                                <label className="text-muted text-sm">Phone</label>
                                <p className="font-medium">{profile?.phone || '-'}</p>
                            </div>
                            <div>
                                <label className="text-muted text-sm">Vehicles</label>
                                <p className="font-medium">{profile?.vehicleCount || 0}</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'appearance' && (
                    <div>
                        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Appearance</h3>
                        <div className="form-group">
                            <label className="form-label">Theme</label>
                            <div className="flex gap-md">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                    <input type="radio" checked={theme === 'light'} onChange={() => theme !== 'light' && toggleTheme()} />
                                    Light
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                    <input type="radio" checked={theme === 'dark'} onChange={() => theme !== 'dark' && toggleTheme()} />
                                    Dark
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'nominees' && (
                    <div>
                        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Emergency Nominees</h3>
                        <p className="text-muted" style={{ marginBottom: 'var(--spacing-lg)' }}>
                            Your nominated emergency contacts who will be notified in case of an incident.
                        </p>
                        <div className="empty-state" style={{ padding: 'var(--spacing-lg)' }}>
                            <h4 className="empty-state-title">No nominees</h4>
                            <p className="empty-state-text">Add emergency contacts to be notified during incidents.</p>
                            <button className="btn btn-primary">+ Add Nominee</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Settings;
