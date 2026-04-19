import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { readAdminStorage } from '../../../../context/adminPersistence';
import { getUserStorageKey } from '../../../shared/utils/userStorageKey';
import {
  readInspectionBookings,
  getBookingIdentityKey,
  getApplicationIdentityKey,
  INSPECTION_BOOKING_STATUSES
} from '../../../shared/utils/inspectionBookings';
import { applyApplicationLifecycleToUnit } from '../../../shared/utils/unitLifecycle';
import { formatDateDDMMYY, formatDateTimeDDMMYY } from '../../../shared/utils/dateFormat';
import { tenantApiClient } from '../../../shared/services/api/tenantApiClient';

const MAX_NOTIFICATIONS = 120;

const ApplicationsContext = createContext();

const formatDateTimeLabel = (isoDate) =>
  formatDateTimeDDMMYY(isoDate);

const formatRelativeTime = (iso) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const parseInspectionDateTime = (dateNumeric, timeRange) => {
  if (!dateNumeric || !timeRange) return null;
  const startTime = String(timeRange).split(' - ')[0]?.trim() || '';
  const match = startTime.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridian = match[3].toUpperCase();

  if (meridian === 'PM' && hour < 12) hour += 12;
  if (meridian === 'AM' && hour === 12) hour = 0;

  const date = new Date(`${dateNumeric}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(hour, minute, 0, 0);
  return date;
};

const sanitizeApplicationForStorage = (application) => {
  if (!application || typeof application !== 'object') return application;
  const docs = application.applicantDocs && typeof application.applicantDocs === 'object'
    ? { ...application.applicantDocs }
    : null;
  if (docs) {
    // Never persist heavy binary previews in localStorage.
    delete docs.governmentIdPreview;
    delete docs.governmentIdMimeType;
  }
  const nextApplication = docs ? { ...application, applicantDocs: docs } : { ...application };
  if (nextApplication.property && typeof nextApplication.property === 'object') {
    const property = { ...nextApplication.property };
    const image = String(property.image || '');
    // Blob/data URLs are heavy and unstable across refresh.
    if (image.startsWith('blob:') || image.startsWith('data:')) {
      property.image = '';
    }
    nextApplication.property = property;
  }
  return nextApplication;
};

const sanitizeApplicationsForStorage = (applications) =>
  Array.isArray(applications) ? applications.map(sanitizeApplicationForStorage) : [];

export const useApplications = () => {
  const context = useContext(ApplicationsContext);
  if (!context) {
    throw new Error('useApplications must be used within ApplicationsProvider');
  }
  return context;
};

export const ApplicationsProvider = ({ children }) => {
  const { user } = useAuth();
  const userKey = getUserStorageKey(user);
  const applicationsStorageKey = `domihive_applications_state_${userKey}`;
  const notificationsStorageKey = `domihive_dashboard_notifications_${userKey}`;
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [syncState, setSyncState] = useState({
    isHydrating: true,
    syncError: ''
  });

  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      const [appsResult, notificationsResult] = await Promise.all([
        tenantApiClient.readUserCollection({
          key: applicationsStorageKey,
          fallback: []
        }),
        tenantApiClient.readUserCollection({
          key: notificationsStorageKey,
          fallback: []
        })
      ]);
      if (!isMounted) return;

      setApplications(
        sanitizeApplicationsForStorage(Array.isArray(appsResult?.data) ? appsResult.data : [])
      );
      setNotifications(Array.isArray(notificationsResult?.data) ? notificationsResult.data : []);
      setSyncState({
        isHydrating: false,
        syncError:
          appsResult?.error?.message ||
          notificationsResult?.error?.message ||
          ''
      });
    };

    hydrate();
    return () => {
      isMounted = false;
    };
  }, [applicationsStorageKey]);

  useEffect(() => {
    if (syncState.isHydrating) return;
    let isMounted = true;
    const persist = async () => {
      const result = await tenantApiClient.writeUserCollection({
        key: applicationsStorageKey,
        value: sanitizeApplicationsForStorage(applications),
        retrySanitizer: sanitizeApplicationsForStorage
      });
      if (!isMounted || result.ok) return;
      setSyncState((prev) => ({
        ...prev,
        syncError: result?.error?.message || prev.syncError
      }));
    };
    persist();
    return () => {
      isMounted = false;
    };
  }, [applications, applicationsStorageKey, syncState.isHydrating]);

  useEffect(() => {
    if (syncState.isHydrating) return;
    let isMounted = true;
    const persist = async () => {
      const result = await tenantApiClient.writeUserCollection({
        key: notificationsStorageKey,
        value: notifications
      });
      if (!isMounted || result.ok) return;
      setSyncState((prev) => ({
        ...prev,
        syncError: result?.error?.message || prev.syncError
      }));
    };
    persist();
    return () => {
      isMounted = false;
    };
  }, [notifications, notificationsStorageKey, syncState.isHydrating]);

  const addNotification = useCallback((notification) => {
    const nowISO = new Date().toISOString();
    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: nowISO,
        read: false,
        type: notification.type || 'info',
        title: notification.title || 'Update',
        message: notification.message || '',
        cta: notification.cta || null,
        ...notification
      },
      ...prev
    ].slice(0, MAX_NOTIFICATIONS));
  }, []);

  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const updateApplication = useCallback((id, changes) => {
    let nextAppSnapshot = null;
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== id) return app;
        const nextApp = {
          ...app,
          ...changes,
          updatedAtISO: new Date().toISOString(),
          updatedAt: 'Just now'
        };
        nextAppSnapshot = nextApp;
        return nextApp;
      })
    );

    if (nextAppSnapshot?.status) {
      applyApplicationLifecycleToUnit({
        application: nextAppSnapshot,
        applicationStatus: nextAppSnapshot.status
      });
    }
  }, []);

  const createApplicationFromBooking = useCallback(({ booking, property, applicantName }) => {
    const parsedInspection = parseInspectionDateTime(booking?.inspectionDate, booking?.inspectionTime);
    const inspectionDateISO = parsedInspection
      ? parsedInspection.toISOString()
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const nowISO = new Date().toISOString();
    const inspectionUnlockAtISO = new Date(Date.now() + 10_000).toISOString();
    const inspectionDateBase = new Date(`${booking?.inspectionDate || ''}T00:00:00`);
    const inspectionDateLabel = Number.isNaN(inspectionDateBase.getTime())
      ? formatDateTimeLabel(inspectionDateISO)
      : `${formatDateDDMMYY(inspectionDateBase)} • ${booking?.inspectionTime || ''}`;
    const propertyId = property?.id || property?.propertyId || booking?.propertyId || 'PROP-UNKNOWN';

    let createdOrUpdated;
    setApplications((prev) => {
      const newApp = {
        id: `APP-${Date.now().toString().slice(-6)}`,
        status: 'INSPECTION_SCHEDULED',
        inspectionStatus:
          booking?.inspectionStatus || INSPECTION_BOOKING_STATUSES.PENDING_CONFIRMATION,
        applicantName: applicantName || 'Tenant',
        inspectionDate: inspectionDateLabel,
        inspectionDateISO,
        inspectionUnlockAtISO,
        attendees: Number(booking?.numberOfPeople || 1),
        bookingId: booking?.bookingId || `DOMI-INSP-${Date.now()}`,
        bookingDateISO: booking?.bookingDate || nowISO,
        inspectionTime: booking?.inspectionTime || '',
        unitCode: booking?.unitCode || '',
        inspectionNotes: booking?.inspectionNotes || '',
        cautionFee: Number(property?.cautionFee || property?.caution || 0),
        serviceCharge: Number(property?.serviceCharge || 0),
        createdAtISO: nowISO,
        updatedAtISO: nowISO,
        updatedAt: 'Just now',
        property: {
          id: propertyId,
          title: property?.title || 'Selected Property',
          location: property?.location || 'Lagos, Nigeria',
          price: Number(property?.price || 0),
          cautionFee: Number(property?.cautionFee || property?.caution || 0),
          serviceCharge: Number(property?.serviceCharge || 0),
          image: property?.image || 'https://images.unsplash.com/photo-1549187774-b4e9b0445b58?w=640',
          unitCode: booking?.unitCode || property?.unitCode || '',
          bedrooms: Number(property?.bedrooms || 0),
          bathrooms: Number(property?.bathrooms || 0),
          size: property?.size || '',
          description: booking?.unitDescription || property?.description || ''
        }
      };
      createdOrUpdated = newApp;
      return [newApp, ...prev];
    });

    const propertyTitle = property?.title || 'Selected Property';
    addNotification({
      type: 'inspection',
      title: 'Inspection Booked',
      message: `${propertyTitle} scheduled for ${inspectionDateLabel}.`,
      cta: { label: 'View Application', path: '/dashboard/rent/applications' }
    });

    addNotification({
      type: 'reminder',
      title: 'Inspection Reminder Enabled',
      message: 'We will send reminders before your inspection date.',
      cta: { label: 'Open Notifications', path: '/dashboard/rent/applications' }
    });

    return createdOrUpdated;
  }, [addNotification]);

  const refreshRelativeTimestamps = useCallback(() => {
    setApplications((prev) =>
      prev.map((app) => ({
        ...app,
        updatedAt: app.updatedAtISO ? formatRelativeTime(app.updatedAtISO) : app.updatedAt
      }))
    );
  }, []);

  useEffect(() => {
    const timer = setInterval(refreshRelativeTimestamps, 60 * 1000);
    return () => clearInterval(timer);
  }, [refreshRelativeTimestamps]);

  // Keep inspection status in sync with admin-side booking updates.
  useEffect(() => {
    const syncInspectionStatuses = () => {
      const bookings = readInspectionBookings();
      if (!bookings.length) return;
      const byBookingId = new Map(
        bookings.map((booking) => [
          String(booking?.bookingId || booking?.id),
          booking?.inspectionStatus ||
            booking?.status ||
            INSPECTION_BOOKING_STATUSES.PENDING_CONFIRMATION
        ])
      );
      const byIdentity = new Map(
        bookings.map((booking) => [
          getBookingIdentityKey(booking),
          booking?.inspectionStatus ||
            booking?.status ||
            INSPECTION_BOOKING_STATUSES.PENDING_CONFIRMATION
        ])
      );

      const statusChanges = [];
      setApplications((prev) => {
        let changed = false;
        const next = prev.map((application) => {
          const bookingId = String(application?.bookingId || '');
          const appIdentity = getApplicationIdentityKey(application);
          const nextInspectionStatus = byBookingId.get(bookingId) || byIdentity.get(appIdentity);
          if (!byBookingId.get(bookingId) && byIdentity.get(appIdentity) && process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.debug('[domihive] inspection sync fallback by identity', {
              bookingId,
              appIdentity
            });
          }
          if (!nextInspectionStatus || application?.inspectionStatus === nextInspectionStatus) {
            return application;
          }
          changed = true;
          statusChanges.push({
            title: application?.property?.title || 'Property',
            nextInspectionStatus
          });
          return {
            ...application,
            inspectionStatus: nextInspectionStatus,
            updatedAtISO: new Date().toISOString(),
            updatedAt: 'Just now'
          };
        });
        return changed ? next : prev;
      });

      if (statusChanges.length) {
        setNotifications((prev) => {
          const nowISO = new Date().toISOString();
          const generated = statusChanges.map((entry) => {
            const map = {
              [INSPECTION_BOOKING_STATUSES.PENDING_CONFIRMATION]: {
                title: 'Inspection Pending Confirmation',
                message: `${entry.title} inspection is pending confirmation from admin.`
              },
              [INSPECTION_BOOKING_STATUSES.SCHEDULED]: {
                title: 'Inspection Scheduled',
                message: `${entry.title} inspection has been scheduled.`
              },
              [INSPECTION_BOOKING_STATUSES.NO_SHOW]: {
                title: 'Inspection Marked No-show',
                message: `${entry.title} inspection was marked as no-show.`
              },
              [INSPECTION_BOOKING_STATUSES.INSPECTION_COMPLETED]: {
                title: 'Inspection Completed',
                message: `${entry.title} inspection has been marked completed. You can proceed to application.`
              }
            };
            const resolved = map[entry.nextInspectionStatus] || {
              title: 'Inspection Updated',
              message: `${entry.title} inspection status changed to ${entry.nextInspectionStatus}.`
            };
            return {
              id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              createdAt: nowISO,
              read: false,
              type: 'inspection',
              ...resolved,
              cta: { label: 'Open My Applications', path: '/dashboard/rent/applications' }
            };
          });
          return [...generated, ...prev].slice(0, MAX_NOTIFICATIONS);
        });
      }
    };

    syncInspectionStatuses();
    const timer = setInterval(syncInspectionStatuses, 2500);
    const onStorage = (event) => {
      if (event.key === 'domihive_inspection_bookings') {
        syncInspectionStatuses();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Sync admin application decisions into tenant-side application states.
  useEffect(() => {
    const mapAdminToTenant = {
      Submitted: 'APPLICATION_SUBMITTED',
      'Under Review': 'UNDER_REVIEW',
      Approved: 'APPROVED',
      Rejected: 'REJECTED'
    };

    const sync = () => {
      const adminData = readAdminStorage() || {};
      const adminApplications = Array.isArray(adminData.applications) ? adminData.applications : [];
      if (!adminApplications.length) return;

      const byTenantId = new Map(
        adminApplications
          .filter((item) => String(item?.id || '').startsWith('tenant-'))
          .map((item) => [String(item.id).replace('tenant-', ''), item])
      );

      const statusChanges = [];
      setApplications((prev) => {
        let changed = false;
        const next = prev.map((app) => {
          const adminApp = byTenantId.get(String(app.id));
          if (!adminApp) return app;
          const mapped = mapAdminToTenant[adminApp.status];
          if (!mapped || mapped === app.status) return app;
          changed = true;
          const nextApp = {
            ...app,
            status: mapped,
            rejectionReason: adminApp?.rejectionReason || app?.rejectionReason || '',
            refundStatus: adminApp?.refundStatus || app?.refundStatus || '',
            refundETA: adminApp?.refundETA || app?.refundETA || '',
            decisionAtISO: adminApp?.decisionAt || app?.decisionAtISO || '',
            updatedAtISO: new Date().toISOString(),
            updatedAt: 'Just now'
          };
          statusChanges.push({
            title: app?.property?.title || 'Application',
            nextStatus: mapped,
            application: nextApp
          });
          return nextApp;
        });
        return changed ? next : prev;
      });

      if (statusChanges.length) {
        setNotifications((prev) => {
          const nowISO = new Date().toISOString();
          const generated = statusChanges.map((entry) => {
            applyApplicationLifecycleToUnit({
              application: entry.application,
              applicationStatus: entry.nextStatus
            });
            const config = {
              APPLICATION_SUBMITTED: {
                title: 'Application Submitted',
                message: `${entry.title} has been submitted successfully.`,
                cta: { label: 'Track Application', path: '/dashboard/rent/applications' }
              },
              UNDER_REVIEW: {
                title: 'Application Under Review',
                message: `${entry.title} is now under review (72 hours SLA).`,
                cta: { label: 'Track Application', path: '/dashboard/rent/applications' }
              },
              APPROVED: {
                title: 'Application Approved',
                message: `${entry.title} has been approved.`,
                cta: {
                  label: 'View Verdict',
                  path: `/dashboard/rent/applications/${entry.application?.id}/track`
                }
              },
              REJECTED: {
                title: 'Application Rejected',
                message: `${entry.title} was not approved this time.`,
                cta: {
                  label: 'View Verdict',
                  path: `/dashboard/rent/applications/${entry.application?.id}/track`
                }
              }
            }[entry.nextStatus];
            return {
              id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              createdAt: nowISO,
              read: false,
              type: 'application',
              ...config
            };
          });
          return [...generated, ...prev].slice(0, MAX_NOTIFICATIONS);
        });
      }
    };

    sync();
    const timer = setInterval(sync, 2500);
    window.addEventListener('storage', sync);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      applications,
      updateApplication,
      notifications,
      unreadNotificationsCount,
      ...syncState,
      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
      createApplicationFromBooking
    }),
    [
      applications,
      updateApplication,
      notifications,
      unreadNotificationsCount,
      syncState,
      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
      createApplicationFromBooking
    ]
  );

  return <ApplicationsContext.Provider value={value}>{children}</ApplicationsContext.Provider>;
};

export default ApplicationsContext;
