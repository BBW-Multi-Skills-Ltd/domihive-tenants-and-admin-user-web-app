// src/dashboards/rent/components/overview/UnifiedActionsPanel.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../../../../context/DashboardContext';

const UnifiedActionsPanel = ({
  rentOnlyMode = true,
  statusDataOverride,
  pendingItemsOverride = [],
  isLoading = false,
  isError = false,
  onRetry
}) => {
  const navigate = useNavigate();
  const { currentDashboard, switchDashboard } = useDashboard();
  
  // State for notifications and quick actions
  const [notifications, setNotifications] = useState([]);
  const [dashboardShortcuts, setDashboardShortcuts] = useState([]);
  
  // State for Rental Journey Status
  const [statusData, setStatusData] = useState({
    browse: '80+ verified properties',
    applications: '0 active applications',
    applicationsBadge: 0,
    inspections: '0 upcoming inspections',
    inspectionsBadge: 0,
    favorites: '0 saved properties',
    favoritesBadge: 0,
    messages: '0 unread messages',
    messagesBadge: 0
  });

  // Load unified data
  useEffect(() => {
    if (statusDataOverride) {
      setStatusData(statusDataOverride);
      return undefined;
    }

    const loadStatusData = () => {
      const savedFavorites = JSON.parse(localStorage.getItem('domihive_user_favorites') || '[]');
      const applications = JSON.parse(localStorage.getItem('domihive_user_applications') || '[]');

      setStatusData({
        browse: '80+ verified properties',
        applications: `${applications.length} active applications`,
        applicationsBadge: applications.length,
        inspections: '0 upcoming inspections',
        inspectionsBadge: 0,
        favorites: `${savedFavorites.length} saved properties`,
        favoritesBadge: savedFavorites.length,
        messages: '0 unread messages',
        messagesBadge: 0
      });
    };

    if (rentOnlyMode) {
      loadStatusData();
      return undefined;
    }

    // Load notifications (cross-dashboard)
    const loadNotifications = () => {
      const mockNotifications = [
        { id: 1, type: 'payment', title: 'Payment Reminder', message: 'Rent payment due in 3 days', dashboard: 'rent', time: '2 hours ago', read: false, priority: 'high' },
        { id: 2, type: 'maintenance', title: 'Maintenance Update', message: 'Your maintenance request #123 has been approved', dashboard: 'rent', time: '1 day ago', read: true, priority: 'medium' },
        { id: 3, type: 'application', title: 'Application Status', message: 'Your property application is under review', dashboard: 'buy', time: '2 days ago', read: false, priority: 'medium' },
        { id: 4, type: 'message', title: 'New Message', message: 'You have a new message from property agent', dashboard: 'commercial', time: '3 days ago', read: true, priority: 'low' },
        { id: 5, type: 'system', title: 'System Update', message: 'New features available in your dashboard', dashboard: 'all', time: '1 week ago', read: true, priority: 'low' }
      ];
      setNotifications(mockNotifications);
    };
    
    // Load dashboard shortcuts
    const loadDashboardShortcuts = () => {
      const shortcuts = [
        { id: 'rent', name: 'For Rent', icon: 'home', enabled: true, description: 'Manage rental properties', notifications: 3 },
        { id: 'buy', name: 'Buy', icon: 'money-bill-wave', enabled: false, description: 'Purchase properties', notifications: 1 },
        { id: 'commercial', name: 'Commercial', icon: 'building', enabled: false, description: 'Commercial spaces', notifications: 1 },
        { id: 'shortlet', name: 'Shortlets', icon: 'hotel', enabled: false, description: 'Short-term stays', notifications: 0 }
      ];
      setDashboardShortcuts(shortcuts);
    };

    loadNotifications();
    loadDashboardShortcuts();
    loadStatusData();

    // Simulate new notifications
    const interval = setInterval(() => {
      setNotifications(prev => {
        if (Math.random() > 0.8) {
          const newNotif = {
            id: Date.now(),
            type: 'system',
            title: 'Live Update',
            message: 'New properties matching your preferences',
            dashboard: 'all',
            time: 'Just now',
            read: false,
            priority: 'medium'
          };
          return [newNotif, ...prev.slice(0, 4)];
        }
        return prev;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [rentOnlyMode, statusDataOverride]);
  
  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Mark as read
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
    
    // Navigate based on notification type
    if (notification.dashboard !== 'all' && notification.dashboard !== currentDashboard) {
      switchDashboard(notification.dashboard);
    }
    
    // Navigate to relevant section
    switch(notification.type) {
      case 'payment':
        navigate('/dashboard/rent/payments');
        break;
      case 'maintenance':
        navigate('/dashboard/rent/maintenance');
        break;
      case 'application':
        navigate(`/dashboard/${notification.dashboard}/applications`);
        break;
      case 'message':
        navigate(`/dashboard/${notification.dashboard}/messages`);
        break;
      default:
        navigate('/dashboard/settings');
    }
  };
  
  // Handle dashboard switch
  const handleDashboardSwitch = (dashboard) => {
    if (dashboard.enabled) {
      switchDashboard(dashboard.id);
      navigate(`/dashboard/${dashboard.id}/overview`);
    } else {
      // Show activation modal/notification
      alert(`To activate ${dashboard.name} dashboard, please upgrade your account or contact support.`);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };
  
  // Navigation handlers for Rental Journey Status
  const handleNavigate = (section) => {
    switch(section) {
      case 'browse':
        navigate(`/dashboard/${currentDashboard}/browse`);
        break;
      case 'applications':
        navigate(`/dashboard/${currentDashboard}/applications`);
        break;
      case 'inspections':
        navigate(`/dashboard/${currentDashboard}/applications`);
        break;
      case 'favorites':
        navigate('/dashboard/rent/favorites');
        break;
      case 'messages':
        navigate(`/dashboard/${currentDashboard}/messages`);
        break;
      default:
        break;
    }
  };

  // Get unread notifications count
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Get priority color
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  return (
    <section className="unified-actions-panel bg-white rounded-lg shadow-md border border-[#e2e8f0] p-6">
      {isError && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          <div className="font-semibold mb-1">Unable to fully sync journey widgets</div>
          <button
            onClick={onRetry}
            className="text-xs font-semibold px-2 py-1 rounded border border-red-300 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading && (
        <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2].map((item) => (
            <div key={item} className="h-14 rounded-lg bg-gray-100 animate-pulse border border-[#e2e8f0]"></div>
          ))}
        </div>
      )}

      {pendingItemsOverride.length > 0 && (
        <div className="pending-items-wrap mb-6 border border-[#e2e8f0] rounded-xl p-4 bg-[#f8fafc]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="pending-items-title text-sm font-semibold text-[#0e1f42]">Pending Items</h4>
            <span className="pending-items-subtitle text-xs text-[#64748b]">Synced tasks</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {pendingItemsOverride.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="pending-item-card text-left border border-[#e2e8f0] rounded-lg p-2 bg-white hover:border-[#9f7539]/40 transition-colors"
              >
                <div className="pending-item-label text-xs text-[#64748b]">{item.label}</div>
                <div className="pending-item-value font-semibold text-[#0e1f42]">{item.value}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!rentOnlyMode && (
        <>
          {/* Notifications Section - Updated colors */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#0e1f42] flex items-center gap-2">
                <i className="fas fa-bell text-[#9f7539]"></i>
                Cross-Dashboard Notifications
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </h3>
              <button
                onClick={markAllAsRead}
                className="text-sm text-[#0e1f42] hover:text-[#9f7539] font-medium transition-colors"
              >
                Mark all as read
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-300 hover:translate-x-2 hover:shadow-md ${
                    notification.read ? 'bg-gray-50' : 'bg-blue-50'
                  } ${getPriorityColor(notification.priority)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      notification.read ? 'bg-gray-200' : 'bg-blue-100'
                    }`}>
                      <i className={`fas fa-${
                        notification.type === 'payment' ? 'credit-card' :
                        notification.type === 'maintenance' ? 'tools' :
                        notification.type === 'application' ? 'file-alt' :
                        notification.type === 'message' ? 'comments' :
                        'bell'
                      } ${notification.read ? 'text-gray-600' : 'text-blue-600'}`}></i>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium ${notification.read ? 'text-[#64748b]' : 'text-[#0e1f42]'}`}>
                          {notification.title}
                        </span>
                        <span className="text-xs text-[#64748b]">{notification.time}</span>
                      </div>
                      <p className="text-sm text-[#64748b] mb-1">{notification.message}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-[#64748b]">
                          {notification.dashboard === 'all' ? 'All Dashboards' : `${notification.dashboard} Dashboard`}
                        </span>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/dashboard/settings?tab=notifications')}
              className="mt-3 w-full py-2 text-sm font-medium text-[#0e1f42] hover:text-[#9f7539] hover:bg-gray-50 rounded-lg transition-colors hover:translate-x-1"
            >
              <i className="fas fa-cog mr-2"></i>
              Configure Notification Preferences
            </button>
          </div>

          {/* Dashboard Switcher Shortcuts */}
          <div className="mb-8">
            <h3 className="font-bold text-[#0e1f42] mb-4 flex items-center gap-2">
              <i className="fas fa-th-large text-[#9f7539]"></i>
              Dashboard Shortcuts
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dashboardShortcuts.map(dashboard => (
                <div
                  key={dashboard.id}
                  onClick={() => handleDashboardSwitch(dashboard)}
                  className={`rounded-xl p-4 border cursor-pointer transition-all duration-300 hover:translate-x-2 hover:shadow-md ${
                    dashboard.id === currentDashboard
                      ? 'bg-gradient-to-br from-[#0e1f42] to-[#1a2d5f] border-[#0e1f42] text-white'
                      : dashboard.enabled
                      ? 'bg-white border-[#e2e8f0] hover:border-[#9f7539]/30'
                      : 'bg-gray-100 border-gray-300 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      dashboard.id === currentDashboard
                        ? 'bg-white/20'
                        : dashboard.enabled
                        ? 'bg-[#f8fafc]'
                        : 'bg-gray-200'
                    }`}>
                      <i className={`fas fa-${dashboard.icon} ${
                        dashboard.id === currentDashboard ? 'text-white' : 'text-[#64748b]'
                      }`}></i>
                    </div>

                    {dashboard.notifications > 0 && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                        dashboard.id === currentDashboard
                          ? 'bg-white/30 text-white'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {dashboard.notifications}
                      </span>
                    )}
                  </div>

                  <div className={`font-medium mb-1 ${
                    dashboard.id === currentDashboard ? 'text-white' : 'text-[#0e1f42]'
                  }`}>
                    {dashboard.name}
                  </div>

                  <div className={`text-xs ${
                    dashboard.id === currentDashboard ? 'text-white/80' : 'text-[#64748b]'
                  }`}>
                    {dashboard.description}
                  </div>

                  {!dashboard.enabled && (
                    <div className="mt-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                      Coming Soon
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/dashboard/settings?tab=dashboards')}
              className="mt-4 w-full py-2 text-sm font-medium text-[#0e1f42] hover:text-[#9f7539] hover:bg-gray-50 rounded-lg transition-colors hover:translate-x-1"
            >
              <i className="fas fa-sliders-h mr-2"></i>
              Manage Dashboard Preferences
            </button>
          </div>
        </>
      )}

      {/* REPLACEMENT: Rental Journey Status Section (instead of Quick Actions) */}
      <div>
        <h3 className="font-bold text-[#0e1f42] mb-6 flex items-center gap-2 status-heading">
          <i className="fas fa-road text-[#9f7539]"></i>
          Your Rental Journey Status
        </h3>
        
        <div className="status-grid grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* APPLICATIONS Section */}
          <div className="status-category border-r border-[#e2e8f0] pr-6">
            <h4 className="category-title text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-6 pb-2 border-b-2 border-[#9f7539]">
              APPLICATIONS
            </h4>
            
            <div 
              className="status-item flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all duration-300 hover:translate-x-2 hover:shadow-md mb-4"
              onClick={() => handleNavigate('applications')}
            >
              <div className="status-icon w-12 h-12 bg-[#f8fafc] rounded-lg flex items-center justify-center text-[#9f7539] text-lg">
                <i className="fas fa-file-alt"></i>
              </div>
              
              <div className="status-content flex-1 min-w-0">
                <span className="status-label block font-semibold text-[#0e1f42] mb-1">
                  My Applications
                </span>
                <span className="status-value text-sm text-[#64748b]" id="applicationsStatus">
                  {statusData.applications}
                </span>
              </div>
              
              {statusData.applicationsBadge > 0 && (
                <div className="status-badge bg-[#9f7539] text-white text-xs font-bold px-2.5 py-1.5 rounded min-w-[28px] text-center" id="applicationsBadge">
                  {statusData.applicationsBadge > 99 ? '99+' : statusData.applicationsBadge}
                </div>
              )}
            </div>
            
            <div 
              className="status-item flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all duration-300 hover:translate-x-2 hover:shadow-md"
              onClick={() => handleNavigate('inspections')}
            >
              <div className="status-icon w-12 h-12 bg-[#f8fafc] rounded-lg flex items-center justify-center text-[#9f7539] text-lg">
                <i className="fas fa-calendar-check"></i>
              </div>
              
              <div className="status-content flex-1 min-w-0">
                <span className="status-label block font-semibold text-[#0e1f42] mb-1">
                  Booked Inspections
                </span>
                <span className="status-value text-sm text-[#64748b]" id="inspectionsStatus">
                  {statusData.inspections}
                </span>
              </div>
              
              {statusData.inspectionsBadge > 0 && (
                <div className="status-badge bg-[#9f7539] text-white text-xs font-bold px-2.5 py-1.5 rounded min-w-[28px] text-center" id="inspectionsBadge">
                  {statusData.inspectionsBadge > 99 ? '99+' : statusData.inspectionsBadge}
                </div>
              )}
            </div>
          </div>

          {/* ACCOUNT Section */}
          <div className="status-category pl-6">
            <h4 className="category-title text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-6 pb-2 border-b-2 border-[#9f7539]">
              ACCOUNT
            </h4>
            
            <div 
              className="status-item flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all duration-300 hover:translate-x-2 hover:shadow-md mb-4"
              onClick={() => handleNavigate('favorites')}
            >
              <div className="status-icon w-12 h-12 bg-[#f8fafc] rounded-lg flex items-center justify-center text-[#9f7539] text-lg">
                <i className="fas fa-heart"></i>
              </div>
              
              <div className="status-content flex-1 min-w-0">
                <span className="status-label block font-semibold text-[#0e1f42] mb-1">
                  Favorites
                </span>
                <span className="status-value text-sm text-[#64748b]" id="favoritesStatus">
                  {statusData.favorites}
                </span>
              </div>
              
              {statusData.favoritesBadge > 0 && (
                <div className="status-badge bg-[#9f7539] text-white text-xs font-bold px-2.5 py-1.5 rounded min-w-[28px] text-center" id="favoritesBadge">
                  {statusData.favoritesBadge > 99 ? '99+' : statusData.favoritesBadge}
                </div>
              )}
            </div>
            
            <div 
              className="status-item flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all duration-300 hover:translate-x-2 hover:shadow-md"
              onClick={() => handleNavigate('messages')}
            >
              <div className="status-icon w-12 h-12 bg-[#f8fafc] rounded-lg flex items-center justify-center text-[#9f7539] text-lg">
                <i className="fas fa-comments"></i>
              </div>
              
              <div className="status-content flex-1 min-w-0">
                <span className="status-label block font-semibold text-[#0e1f42] mb-1">
                  Messages
                </span>
                <span className="status-value text-sm text-[#64748b]" id="messagesStatus">
                  {statusData.messages}
                </span>
              </div>
              
              {statusData.messagesBadge > 0 && (
                <div className="status-badge bg-[#9f7539] text-white text-xs font-bold px-2.5 py-1.5 rounded min-w-[28px] text-center" id="messagesBadge">
                  {statusData.messagesBadge > 99 ? '99+' : statusData.messagesBadge}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UnifiedActionsPanel;
