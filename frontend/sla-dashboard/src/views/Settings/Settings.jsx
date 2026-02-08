/**
 * Settings Page for SLA Dashboard
 */

import { useState } from 'react';
import { useTheme } from '../../../../shared/hooks/useTheme.jsx';
import { useAuth } from '../../../../shared/hooks/useAuth.jsx';

function Settings() {
    const { theme, toggleTheme } = useTheme();
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: 'General' },
        { id: 'appearance', label: 'Appearance' },
        { id: 'profile', label: 'Profile' },
    ];

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">Configure your dashboard</p>
                </div>
            </div>

            <div className="card">
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: 'var(--spacing-lg)'
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className="btn btn-ghost"
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

                {activeTab === 'general' && (
                    <div>
                        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>General Settings</h3>
                        <div className="form-group">
                            <label className="form-label">Default View</label>
                            <select className="form-input form-select" style={{ maxWidth: 300 }}>
                                <option value="dashboard">Dashboard</option>
                                <option value="authorities">Authorities</option>
                                <option value="analytics">Analytics</option>
                            </select>
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
                                    <input type="radio" name="theme" checked={theme === 'light'} onChange={() => theme !== 'light' && toggleTheme()} />
                                    Light
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                    <input type="radio" name="theme" checked={theme === 'dark'} onChange={() => theme !== 'dark' && toggleTheme()} />
                                    Dark
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div>
                        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Profile</h3>
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
                                <label className="text-muted text-sm">Role</label>
                                <p className="font-medium">{user?.role || '-'}</p>
                            </div>
                            <div>
                                <label className="text-muted text-sm">State</label>
                                <p className="font-medium">{profile?.state || '-'}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Settings;
