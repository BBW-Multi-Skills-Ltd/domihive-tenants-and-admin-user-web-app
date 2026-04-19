// src/components/dashboard/layout/DashboardLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useDashboard } from '../../../context/DashboardContext';
import Header from './Header';
import Sidebar from './Sidebar';
import TenantShellProviders from './TenantShellProviders';

const DashboardLayout = () => {
  const [sidebarState, setSidebarState] = useState('expanded'); // 'expanded' | 'collapsed'
  const [isMobile, setIsMobile] = useState(false);
  const { loading } = useAuth();
  const { currentDashboard } = useDashboard();
  const navigate = useNavigate();
  const location = useLocation();
  const [guardToast, setGuardToast] = useState('');
  const isBlockedGuardToast = (message) => {
    const normalized = String(message || '').trim().toLowerCase();
    return normalized.includes('payment already submitted');
  };

  // Handle responsive sidebar
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);

      if (mobile) {
        setSidebarState('collapsed');
      } else {
        const savedState = localStorage.getItem('domihive_sidebar_state');
        if (savedState && ['expanded', 'collapsed'].includes(savedState)) {
          setSidebarState(savedState);
        } else {
          setSidebarState('expanded');
        }
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Save sidebar state to localStorage when it changes (desktop only)
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('domihive_sidebar_state', sidebarState);
    }
  }, [sidebarState, isMobile]);

  useEffect(() => {
    document.body.classList.add('dashboard-themed');
    return () => {
      document.body.classList.remove('dashboard-themed');
    };
  }, []);

  useEffect(() => {
    const message = location.state?.guardToast;
    if (!message) return undefined;
    const safeMessage = isBlockedGuardToast(message) ? '' : message;
    setGuardToast(safeMessage);

    navigate(location.pathname, { replace: true, state: null });

    if (!safeMessage) return undefined;

    const timer = window.setTimeout(() => setGuardToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [location, navigate]);

  const toggleSidebar = () => {
    setSidebarState((prev) => (prev === 'expanded' ? 'collapsed' : 'expanded'));
  };

  const closeMobileSidebar = () => {
    if (isMobile) {
      setSidebarState('collapsed');
    }
  };

  // Calculate main content margin based on sidebar state
  const getMainMargin = () => {
    if (isMobile) return 'ml-0';

    if (sidebarState === 'expanded') return 'ml-64'; // w-64 = 256px
    return 'ml-20'; // w-20 = 80px when collapsed
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--page-bg,#f8f9fa)]">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent-color,#9f7539)]"></div>
      </div>
    );
  }

  return (
    <TenantShellProviders>
      <div className="dashboard-layout flex h-screen overflow-hidden bg-(--light-gray)">
        {/* Sidebar - fixed position */}
        <Sidebar
          sidebarState={sidebarState}
          toggleSidebar={toggleSidebar}
          closeMobileSidebar={closeMobileSidebar}
          isMobile={isMobile}
          currentDashboard={currentDashboard}
        />

        {/* Main Content Area */}
        <div className={`dashboard-main flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ease-in-out ${getMainMargin()}`}>
          {/* Header - fixed at top */}
          <Header
            toggleSidebar={toggleSidebar}
            isMobile={isMobile}
            sidebarState={sidebarState}
          />

          {/* Content Area - scrollable */}
          <main className="dashboard-content no-scrollbar flex-1 overflow-auto">
            {guardToast && !isBlockedGuardToast(guardToast) && (
              <div className="sticky top-0 z-[1190] px-4 md:px-6 pt-3">
                <div className="mx-auto max-w-4xl rounded-xl border border-[#f59e0b]/35 bg-[#fff7ed] text-[#9a3412] px-4 py-2 text-sm font-medium shadow-sm">
                  <i className="fas fa-circle-info mr-2"></i>
                  {guardToast}
                </div>
              </div>
            )}
            <Outlet />
          </main>
        </div>
      </div>
    </TenantShellProviders>
  );
};

export default DashboardLayout;
