import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useDashboard } from '../../../context/DashboardContext';
import { useJourney } from '../rent/contexts/JourneyContext';
import { lockBodyScroll, unlockBodyScroll } from '../../../utils/scrollLock';
import { formatDateTimeDDMMYY } from '../../shared/utils/dateFormat';

const Header = ({ toggleSidebar, isMobile }) => {
  const { user, logout } = useAuth();
  const { currentDashboard, switchDashboard } = useDashboard();
  const { notifications, unreadNotificationsCount, markNotificationRead, markAllNotificationsRead } = useJourney();
  const location = useLocation();
  const navigate = useNavigate();

  const [breadcrumb, setBreadcrumb] = useState('Dashboard');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDashboardSwitcher, setShowDashboardSwitcher] = useState(false);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('domihive_theme') || 'light';
    return saved === 'dark-gray' || saved === 'gold-dark' || saved === 'true-black';
  });

  const themeMap = {
    light: {
      '--primary-color': '#0E1F42',
      '--accent-color': '#9F7539',
      '--accent-light': '#b58a4a',
      '--page-bg': '#f8f9fa',
      '--card-bg': '#ffffff',
      '--text-color': '#0e1f42',
      '--text-muted': '#6c757d'
    },
    'dark-gray': {
      '--primary-color': '#0E1F42',
      '--accent-color': '#9F7539',
      '--accent-light': '#b58a4a',
      '--page-bg': '#0b0f17',
      '--card-bg': '#0f172a',
      '--text-color': '#f8fafc',
      '--text-muted': '#94a3b8'
    },
    'gold-dark': {
      '--primary-color': '#2a2117',
      '--accent-color': '#9F7539',
      '--accent-light': '#b58a4a',
      '--page-bg': '#15110b',
      '--card-bg': '#1e1710',
      '--text-color': '#f8f3eb',
      '--text-muted': '#cfbfa7'
    },
    'true-black': {
      '--primary-color': '#0E1F42',
      '--accent-color': '#9F7539',
      '--accent-light': '#b58a4a',
      '--page-bg': '#000000',
      '--card-bg': '#0b0b0b',
      '--text-color': '#f8fafc',
      '--text-muted': '#cbd5e1'
    }
  };

  const applyTheme = (themeId) => {
    const selected = themeMap[themeId] || themeMap.light;
    Object.entries(selected).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    document.documentElement.setAttribute('data-theme', themeId);
    document.body?.setAttribute('data-theme', themeId);
    localStorage.setItem('domihive_theme', themeId);
    if (themeId !== 'light') {
      localStorage.setItem('domihive_dark_theme', themeId);
      setIsDarkMode(true);
    } else {
      setIsDarkMode(false);
    }
  };

  const toggleTheme = () => {
    const currentTheme = localStorage.getItem('domihive_theme') || 'light';
    if (currentTheme === 'light') {
      const preferredDarkTheme = localStorage.getItem('domihive_dark_theme') || 'dark-gray';
      const nextDarkTheme = preferredDarkTheme === 'dark-gray' ? preferredDarkTheme : 'dark-gray';
      localStorage.setItem('domihive_dark_theme', nextDarkTheme);
      applyTheme(nextDarkTheme);
      return;
    }
    applyTheme('light');
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('domihive_theme') || 'light';
    applyTheme(savedTheme);
  }, []);

  useEffect(() => {
    const path = location.pathname;
    let newBreadcrumb = 'Dashboard';

    if (path.includes('/overview')) newBreadcrumb = 'Overview';
    else if (path.includes('/browse')) newBreadcrumb = 'Browse Properties';
    else if (path.includes('/applications')) newBreadcrumb = 'My Applications';
    else if (path.includes('/my-properties')) newBreadcrumb = 'My Properties';
    else if (path.includes('/maintenance')) newBreadcrumb = 'Maintenance';
    else if (path.includes('/payments')) newBreadcrumb = 'Payments';
    else if (path.includes('/messages')) newBreadcrumb = 'Messages';
    else if (path.includes('/favorites')) newBreadcrumb = 'Favorites';
    else if (path.includes('/settings')) newBreadcrumb = 'Settings';

    setBreadcrumb(newBreadcrumb);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowUserDropdown(false);
      setShowDashboardSwitcher(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showNotificationsDrawer) return undefined;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [showNotificationsDrawer]);

  const getDashboardName = () => {
    const names = {
      rent: 'For Rent',
      shortlet: 'Shortlets',
      commercial: 'Commercial',
      buy: 'Buy'
    };
    return names[currentDashboard] || 'Dashboard';
  };

  const getDashboardIcon = () => {
    const icons = {
      rent: 'home',
      shortlet: 'hotel',
      commercial: 'building',
      buy: 'money-bill-wave'
    };
    return icons[currentDashboard] || 'chart-line';
  };

  const handleSwitchDashboard = (dashboard) => {
    switchDashboard(dashboard);
    setShowDashboardSwitcher(false);
    navigate(`/dashboard/${dashboard}/overview`);
  };

  const availableDashboards = [
    { id: 'rent', name: 'For Rent', icon: 'home', enabled: true },
    { id: 'shortlet', name: 'Shortlets', icon: 'hotel', enabled: false },
    { id: 'commercial', name: 'Commercial', icon: 'building', enabled: false },
    { id: 'buy', name: 'Buy', icon: 'money-bill-wave', enabled: false }
  ];

  const recentNotifications = useMemo(() => notifications.slice(0, 30), [notifications]);
  const hasUnreadNotifications = unreadNotificationsCount > 0;

  if (!user) return null;

  return (
    <>
      <header className="dashboard-header bg-white border-b border-gray-200 px-4 lg:px-6 py-3 lg:py-4 sticky top-0 z-[1200]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 lg:gap-4">
            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="mobile-menu-btn p-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
                title="Toggle sidebar"
              >
                <i className="fas fa-bars text-lg"></i>
              </button>
            )}

            <div className="breadcrumb hidden lg:flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium text-gray-900">{getDashboardName()}</span>
              <i className="fas fa-chevron-right text-xs text-gray-400"></i>
              <span className="breadcrumb-active font-semibold text-gray-900">{breadcrumb}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDashboardSwitcher(!showDashboardSwitcher);
                  setShowUserDropdown(false);
                }}
                className="dashboard-switcher-btn flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <i className={`fas fa-${getDashboardIcon()} text-gray-700`}></i>
                <span className="text-sm font-medium text-gray-900 hidden lg:inline">{getDashboardName()}</span>
                <i className="fas fa-chevron-down text-xs text-gray-500"></i>
              </button>

              {showDashboardSwitcher && (
                <div className="dashboard-switcher-dropdown absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[1200]">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Switch Dashboard
                  </div>

                  {availableDashboards.map((dashboard) => (
                    <button
                      key={dashboard.id}
                      onClick={() => handleSwitchDashboard(dashboard.id)}
                      className={`
                      switcher-item w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors
                      ${dashboard.id === currentDashboard ? 'bg-blue-50 text-blue-700 current-dashboard' : 'text-gray-700'}
                      ${!dashboard.enabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                      disabled={!dashboard.enabled}
                    >
                      <i className={`fas fa-${dashboard.icon} w-5 text-center`}></i>
                      <span className="flex-1 font-medium">{dashboard.name}</span>

                      {dashboard.id === currentDashboard && <i className="fas fa-check text-blue-600"></i>}

                      {!dashboard.enabled && (
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded">Coming Soon</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="quick-actions hidden lg:flex items-center gap-1">
              <button
                className="action-btn p-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={toggleTheme}
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <button
                className="action-btn p-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors relative"
                title="Notifications"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDashboardSwitcher(false);
                  setShowUserDropdown(false);
                  if (hasUnreadNotifications) {
                    markAllNotificationsRead();
                  }
                  setShowNotificationsDrawer(true);
                }}
              >
                <i className="fas fa-bell"></i>
                {hasUnreadNotifications && (
                  <span className="notification-badge absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center font-bold">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

            </div>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserDropdown(!showUserDropdown);
                  setShowDashboardSwitcher(false);
                }}
                className="user-menu-btn flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="user-avatar-sm w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200">
                  {user.profilePhoto ? (
                    <img
                      src={user.profilePhoto}
                      alt={user.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=9f7539&color=fff`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                      <i className="fas fa-user text-blue-600"></i>
                    </div>
                  )}
                </div>

                <div className="hidden lg:block text-left">
                  <div className="user-name-sm text-sm font-semibold text-gray-900 truncate max-w-[120px]">
                    {user.name || 'User'}
                  </div>
                  <div className="user-role text-xs text-gray-600">@{user.username || 'username'}</div>
                </div>

                <i className="fas fa-chevron-down text-xs text-gray-500"></i>
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[1200]">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <div className="user-dropdown-name font-semibold text-gray-900">{user.name || 'User'}</div>
                    <div className="text-sm text-gray-600">@{user.username || 'username'}</div>
                  </div>

                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigate('/dashboard/settings');
                      }}
                      className="user-dropdown-item w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <i className="fas fa-user text-gray-600 w-5"></i>
                      <span className="text-gray-700 font-medium">My Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigate('/dashboard/settings');
                      }}
                      className="user-dropdown-item w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <i className="fas fa-cog text-gray-600 w-5"></i>
                      <span className="text-gray-700 font-medium">Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigate('/dashboard/rent/favorites');
                      }}
                      className="user-dropdown-item w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <i className="fas fa-heart text-gray-600 w-5"></i>
                      <span className="text-gray-700 font-medium">Favorites</span>
                    </button>
                  </div>

                  <div className="border-t border-gray-100 pt-2">
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to logout?')) {
                          logout();
                          navigate('/login');
                        }
                      }}
                      className="user-dropdown-item w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                    >
                      <i className="fas fa-sign-out-alt w-5"></i>
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showNotificationsDrawer && (
        <div className="fixed inset-0 z-[1300]">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowNotificationsDrawer(false)}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-gray-200 flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                <p className="text-xs text-gray-500">{unreadNotificationsCount} unread</p>
              </div>
              <button
                onClick={() => setShowNotificationsDrawer(false)}
                className="h-9 w-9 rounded-full hover:bg-gray-100 text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <button
                onClick={markAllNotificationsRead}
                className="text-sm font-semibold"
                style={{ color: 'var(--accent-color, #9F7539)' }}
              >
                Mark all as read
              </button>
              <button
                onClick={() => {
                  setShowNotificationsDrawer(false);
                  navigate('/dashboard/rent/applications');
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Open applications
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {recentNotifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">No notifications yet.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentNotifications.map((notification) => (
                    <article
                      key={notification.id}
                      className={`px-5 py-4 ${notification.read ? 'bg-white' : 'bg-amber-50/40'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="mt-0.5 h-8 w-8 rounded-full flex items-center justify-center text-sm"
                          style={{ backgroundColor: 'rgba(159,117,57,0.12)', color: 'var(--accent-color, #9F7539)' }}
                        >
                          <i className="fas fa-bell"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                            {!notification.read && <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5"></span>}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDateTimeDDMMYY(notification.createdAt)}
                          </p>

                          <div className="mt-3 flex items-center gap-3">
                            {notification.cta?.path && (
                              <button
                                onClick={() => {
                                  markNotificationRead(notification.id);
                                  setShowNotificationsDrawer(false);
                                  navigate(notification.cta.path);
                                }}
                                className="text-xs font-semibold"
                                style={{ color: 'var(--accent-color, #9F7539)' }}
                              >
                                {notification.cta.label || 'Open'}
                              </button>
                            )}
                            {!notification.read && (
                              <button
                                onClick={() => markNotificationRead(notification.id)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default Header;
