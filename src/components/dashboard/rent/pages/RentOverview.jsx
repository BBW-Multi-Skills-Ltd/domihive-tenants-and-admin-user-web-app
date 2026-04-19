import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bath, BedDouble, Calendar, Eye, FileText, Home, MessageCircle, Ruler, Search, Wrench } from 'lucide-react';
import { useApplications } from '../contexts/ApplicationsContext';
import { useProperties } from '../contexts/PropertiesContext';
import { useMessages } from '../contexts/MessagesContext';
import { useMaintenance } from '../contexts/MaintenanceContext';
import { formatDateTimeDDMMYY } from '../../../shared/utils/dateFormat';
import { getOverviewRecentProperties, RECENT_PROPERTIES_EVENT } from '../../../shared/utils/recentProperties';
import { formatNairaYear } from '../../../shared/utils/moneyFormat';
import { calculateOverviewStats } from '../components/common/tenantStatCalculators';
import usePageBootstrapLoading from '../../../shared/hooks/usePageBootstrapLoading';
const RECENT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=1400&h=900&fit=crop';

const statusStyles = {
  approved: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  under_review: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  inspection: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  maintenance: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  message: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
};

const RentOverview = () => {
  const navigate = useNavigate();
  const { applications, notifications } = useApplications();
  const { properties } = useProperties();
  const { threads } = useMessages();
  const { tickets } = useMaintenance();
  const isPageLoading = usePageBootstrapLoading();

  const stats = useMemo(
    () => calculateOverviewStats({ applications, properties, threads }),
    [applications, properties, threads]
  );

  const recentActivity = useMemo(() => {
    const appActivities = applications.map((app) => {
      const status = String(app.status || '').toUpperCase();
      let key = 'default';
      if (status === 'APPROVED') key = 'approved';
      else if (status === 'REJECTED' || status === 'CANCELLED') key = 'rejected';
      else if (status === 'UNDER_REVIEW') key = 'under_review';
      else key = 'inspection';

      return {
        id: `app-${app.id}`,
        title: app.property?.title || 'Property Application',
        details: status.replaceAll('_', ' '),
        statusKey: key,
        timestamp: app.updatedAtISO || app.createdAtISO || new Date().toISOString()
      };
    });

    const ticketActivities = tickets.slice(0, 8).map((ticket) => ({
      id: `ticket-${ticket.id}`,
      title: ticket.propertyName || 'Maintenance Request',
      details: ticket.title || ticket.category || 'Maintenance update',
      statusKey: 'maintenance',
      timestamp: ticket.updatedAt || ticket.createdAt || new Date().toISOString()
    }));

    const messageActivities = threads.slice(0, 8).map((thread) => ({
      id: `thread-${thread.threadId}`,
      title: thread.subject || 'Message',
      details: thread.lastMessage || 'New message',
      statusKey: 'message',
      timestamp: thread.lastUpdatedAt || new Date().toISOString()
    }));

    const notificationActivities = notifications.slice(0, 8).map((item) => ({
      id: `notif-${item.id}`,
      title: item.title || 'Notification',
      details: item.message || '',
      statusKey: item.type === 'message' ? 'message' : 'default',
      timestamp: item.createdAt || new Date().toISOString()
    }));

    return [...appActivities, ...ticketActivities, ...messageActivities, ...notificationActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
  }, [applications, tickets, threads, notifications]);

  const [recentlyViewed, setRecentlyViewed] = useState(() => getOverviewRecentProperties());

  useEffect(() => {
    const syncRecentlyViewed = () => {
      setRecentlyViewed(getOverviewRecentProperties());
    };

    window.addEventListener('storage', syncRecentlyViewed);
    window.addEventListener(RECENT_PROPERTIES_EVENT, syncRecentlyViewed);
    window.addEventListener('focus', syncRecentlyViewed);

    return () => {
      window.removeEventListener('storage', syncRecentlyViewed);
      window.removeEventListener(RECENT_PROPERTIES_EVENT, syncRecentlyViewed);
      window.removeEventListener('focus', syncRecentlyViewed);
    };
  }, []);

  if (isPageLoading) {
    const skeletonStyle = { backgroundColor: 'rgba(148, 163, 184, 0.28)' };
    return (
      <div className="rent-overview-container bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-64 rounded-md animate-pulse" style={skeletonStyle}></div>
            <div className="h-4 w-80 rounded-md animate-pulse" style={skeletonStyle}></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`overview-stat-skeleton-${index}`}
                className="rounded-lg p-4 shadow border border-gray-100 dark:border-white/10"
                style={{ backgroundColor: 'var(--card-bg,#ffffff)' }}
              >
                <div className="h-5 w-24 rounded-md animate-pulse mb-3" style={skeletonStyle}></div>
                <div className="h-8 w-12 rounded-md animate-pulse mb-2" style={skeletonStyle}></div>
                <div className="h-4 w-20 rounded-md animate-pulse" style={skeletonStyle}></div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[3.5fr_6.5fr] items-start gap-6">
            <div className="rounded-lg p-4 shadow border border-gray-100 dark:border-white/10" style={{ backgroundColor: 'var(--card-bg,#ffffff)' }}>
              <div className="h-6 w-32 rounded-md animate-pulse mb-4" style={skeletonStyle}></div>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`overview-quick-action-skeleton-${index}`} className="h-11 rounded-lg animate-pulse" style={skeletonStyle}></div>
                ))}
              </div>
            </div>

            <div className="rounded-lg p-4 shadow border border-gray-100 dark:border-white/10" style={{ backgroundColor: 'var(--card-bg,#ffffff)' }}>
              <div className="h-6 w-32 rounded-md animate-pulse mb-4" style={skeletonStyle}></div>
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`overview-activity-skeleton-${index}`} className="rounded-lg border border-gray-100 dark:border-white/10 p-3">
                    <div className="h-4 w-44 rounded-md animate-pulse mb-2" style={skeletonStyle}></div>
                    <div className="h-3 w-60 rounded-md animate-pulse" style={skeletonStyle}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg p-4 shadow border border-gray-100 dark:border-white/10" style={{ backgroundColor: 'var(--card-bg,#ffffff)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 w-36 rounded-md animate-pulse" style={skeletonStyle}></div>
              <div className="h-4 w-16 rounded-md animate-pulse" style={skeletonStyle}></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`overview-recent-skeleton-${index}`} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-color,#e2e8f0)' }}>
                  <div className="h-24 w-full animate-pulse" style={skeletonStyle}></div>
                  <div className="p-3 space-y-2">
                    <div className="h-4 w-2/3 rounded-md animate-pulse" style={skeletonStyle}></div>
                    <div className="h-3 w-full rounded-md animate-pulse" style={skeletonStyle}></div>
                    <div className="h-3 w-1/2 rounded-md animate-pulse" style={skeletonStyle}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rent-overview-container bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0e1f42] dark:text-white mb-2">Dashboard Overview</h1>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
            Welcome back. Here&apos;s what&apos;s happening in your rental journey.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <div className="bg-white dark:bg-[#111827] rounded-lg p-4 shadow border border-gray-100 dark:border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs md:text-sm text-[var(--text-muted,#64748b)]">Active Applications</div>
              <div className="text-2xl font-bold text-[var(--text-color,#0e1f42)]">{stats.activeApplications}</div>
              <div className="text-xs text-[var(--text-muted,#64748b)]">In progress</div>
            </div>
            <div className="bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 rounded-lg p-2">
              <FileText />
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] rounded-lg p-4 shadow border border-gray-100 dark:border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs md:text-sm text-[var(--text-muted,#64748b)]">Upcoming Inspections</div>
              <div className="text-2xl font-bold text-[var(--text-color,#0e1f42)]">{stats.upcomingInspections}</div>
              <div className="text-xs text-[var(--text-muted,#64748b)]">Scheduled</div>
            </div>
            <div className="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 rounded-lg p-2">
              <Calendar />
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] rounded-lg p-4 shadow border border-gray-100 dark:border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs md:text-sm text-[var(--text-muted,#64748b)]">Active Properties</div>
              <div className="text-2xl font-bold text-[var(--text-color,#0e1f42)]">{stats.activeProperties}</div>
              <div className="text-xs text-[var(--text-muted,#64748b)]">Managed</div>
            </div>
            <div className="bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 rounded-lg p-2">
              <Home />
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] rounded-lg p-4 shadow border border-gray-100 dark:border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs md:text-sm text-[var(--text-muted,#64748b)]">Unread Messages</div>
              <div className="text-2xl font-bold text-[var(--text-color,#0e1f42)]">{stats.unreadMessages}</div>
              <div className="text-xs text-[var(--text-muted,#64748b)]">Needs response</div>
            </div>
            <div className="bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 rounded-lg p-2">
              <MessageCircle />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[3.5fr_6.5fr] items-start gap-6">
          <div className="bg-white dark:bg-[#111827] rounded-lg p-4 shadow border border-gray-100 dark:border-white/10">
            <h3 className="font-semibold text-[#0e1f42] dark:text-white mb-4">Quick Actions</h3>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => navigate('/dashboard/rent/browse')}
                className="bg-[#9F7539] text-sm text-white w-full hover:bg-[#b58a4a] p-3 rounded-lg cursor-pointer transition duration-300 flex items-center gap-2 font-semibold"
              >
                <Search size={18} />
                Browse Properties
              </button>
              <button
                onClick={() => navigate('/dashboard/rent/applications')}
                className="text-[#9F7539] text-sm bg-white dark:bg-[#111827] w-full border border-gray-100 dark:border-white/10 p-3 rounded-lg cursor-pointer transition duration-300 flex items-center gap-2 font-semibold"
              >
                <FileText size={18} />
                My Applications
              </button>
              <button
                onClick={() => navigate('/dashboard/rent/my-properties')}
                className="border border-gray-200 dark:border-white/10 text-sm hover:border-gray-500 dark:hover:border-gray-400 cursor-pointer text-gray-600 dark:text-gray-400 w-full rounded-lg p-3 transition duration-300 flex items-center gap-2 font-semibold"
              >
                <Home size={18} />
                My Properties
              </button>
              <button
                onClick={() => navigate('/dashboard/rent/maintenance')}
                className="border border-gray-200 dark:border-white/10 text-sm hover:border-gray-500 dark:hover:border-gray-400 cursor-pointer text-gray-600 dark:text-gray-400 w-full rounded-lg p-3 transition duration-300 flex items-center gap-2 font-semibold"
              >
                <Wrench size={18} />
                Maintenance
              </button>
            </div>
          </div>

          <div
            className="bg-white dark:bg-[#111827] rounded-lg p-4 shadow border border-gray-100 dark:border-white/10 max-h-[540px] overflow-auto"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#9f7539 transparent' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#0e1f42] dark:text-white">Recent Activity</h3>
            </div>
            {recentActivity.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-8">
                No recent activity yet.
              </div>
            ) : (
              <ul className="space-y-4">
                {recentActivity.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-white/5 pb-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[#0e1f42] dark:text-white">{item.title}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.details}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] whitespace-nowrap capitalize px-2 py-0.5 rounded-full font-medium ${statusStyles[item.statusKey] || statusStyles.default}`}>
                        {item.statusKey === 'under_review' ? 'under review' : item.statusKey}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {formatDateTimeDDMMYY(item.timestamp)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-lg p-4 shadow border border-gray-100 dark:border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0e1f42] dark:text-white">Recently Viewed</h3>
            <button
              onClick={() => navigate('/dashboard/rent/browse')}
              className="text-xs font-semibold text-[#9F7539] hover:underline"
            >
              View more
            </button>
          </div>

          {recentlyViewed.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">No recently viewed property yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentlyViewed.map((item) => (
                <button
                  key={item.id || `${item.title}-${item.viewedAt}`}
                  onClick={() => {
                    if (item?.id) {
                      navigate('/dashboard/rent/browse', {
                        state: { openPropertyId: item.id, openPropertyData: item }
                      });
                      return;
                    }
                    navigate('/dashboard/rent/browse');
                  }}
                  className="text-left rounded-xl overflow-hidden border hover:shadow-md transition"
                  style={{
                    backgroundColor: 'var(--card-bg,#0b1220)',
                    borderColor: 'var(--border-color,#1e293b)'
                  }}
                >
                  <img
                    src={item.image || RECENT_FALLBACK_IMAGE}
                    alt={item.title}
                    className="w-full h-24 object-cover"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = RECENT_FALLBACK_IMAGE;
                    }}
                  />
                  <div className="p-3 space-y-1">
                    <p className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--text-color,#ffffff)' }}>
                      {item.title || 'Property'}
                    </p>
                    <p className="text-xs line-clamp-1" style={{ color: 'var(--text-muted,#94a3b8)' }}>
                      {item.location || 'Lagos, Nigeria'}
                    </p>
                    <p className="text-xs font-bold text-[#9f7539]">
                      {Number(item.price || 0) > 0 ? formatNairaYear(item.price, { compact: true }) : 'Price on request'}
                    </p>
                    <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted,#94a3b8)' }}>
                      <span className="inline-flex items-center gap-1">
                        <BedDouble size={12} className="text-[#9f7539]" />
                        {Number(item.bedrooms || 0)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Bath size={12} className="text-[#9f7539]" />
                        {Number(item.bathrooms || 0)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Ruler size={12} className="text-[#9f7539]" />
                        {item.size || '-'}
                        {String(item.size || '').includes('sqm') ? '' : ' sqm'}
                      </span>
                    </div>
                    <p className="text-[11px] line-clamp-2" style={{ color: 'var(--text-muted,#94a3b8)' }}>
                      {item.description || 'Recently viewed property'}
                    </p>
                    <div className="inline-flex items-center gap-1 text-[11px] text-[#9F7539] font-medium">
                      <Eye size={12} />
                      {item.viewedAt ? formatDateTimeDDMMYY(item.viewedAt) : 'Recently'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RentOverview;
