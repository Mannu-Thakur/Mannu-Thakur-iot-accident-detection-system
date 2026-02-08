/**
 * MainLayout Component
 * Page layout with sidebar, navbar, and content area
 */

import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Navbar from './Navbar.jsx';
import { ToastContainer } from '../Feedback/Toast.jsx';
import './MainLayout.css';

export function MainLayout({ sidebarItems, pageTitle }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isMediumDevice, setIsMediumDevice] = useState(false);

    // Check for medium device on mount and resize
    useEffect(() => {
        const checkMediumDevice = () => {
            setIsMediumDevice(window.innerWidth <= 1024 && window.innerWidth > 768);
        };
        checkMediumDevice();
        window.addEventListener('resize', checkMediumDevice);
        return () => window.removeEventListener('resize', checkMediumDevice);
    }, []);

    const toggleSidebar = () => {
        setSidebarCollapsed(prev => !prev);
    };

    const toggleMobileMenu = () => {
        // On medium devices, toggle collapse; on mobile, toggle slide
        if (isMediumDevice) {
            setSidebarCollapsed(prev => !prev);
        } else {
            setMobileOpen(prev => !prev);
        }
    };

    return (
        <div className={`layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebar
                items={sidebarItems}
                collapsed={sidebarCollapsed}
                onToggle={toggleSidebar}
                mobileOpen={mobileOpen}
            />

            <div className="main-content">
                <Navbar title={pageTitle} onMenuClick={toggleMobileMenu} />

                <main className="page-content">
                    <Outlet />
                </main>
            </div>

            <ToastContainer />

            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="mobile-overlay" onClick={toggleMobileMenu} />
            )}
        </div>
    );
}

export default MainLayout;
