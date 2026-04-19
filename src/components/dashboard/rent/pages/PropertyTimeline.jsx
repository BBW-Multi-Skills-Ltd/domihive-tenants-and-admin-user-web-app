import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import UnifiedPanelPage, { UnifiedPanelSection } from '../../../shared/layout/UnifiedPanelPage';
import { useProperties } from '../contexts/PropertiesContext';
import { useApplications } from '../contexts/ApplicationsContext';
import { INSPECTION_BOOKING_STATUSES } from '../../../shared/utils/inspectionBookings';
import usePageBootstrapLoading from '../../../shared/hooks/usePageBootstrapLoading';

const APP_STAGE_ORDER = [
  'INSPECTION_SCHEDULED',
  'INSPECTION_VERIFIED',
  'APPLICATION_STARTED',
  'APPLICATION_SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const statusKindDot = {
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  accent: '#9f7539'
};

const parseAnyDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const dmy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) {
    const date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dmyShort = raw.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (dmyShort) {
    const year = Number(dmyShort[3]) + 2000;
    const date = new Date(year, Number(dmyShort[2]) - 1, Number(dmyShort[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const iso = new Date(raw);
  return Number.isNaN(iso.getTime()) ? null : iso;
};

const formatDateTimeDDMMYYYY = (value) => {
  const date = parseAnyDate(value);
  if (!date) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const hasTime = !(hh === '00' && mm === '00');
  return hasTime ? `${day}/${month}/${year} • ${hh}:${mm}` : `${day}/${month}/${year}`;
};

const normalizeDate = (value) => {
  const d = parseAnyDate(value);
  if (!d) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const startOfWeek = (date) => {
  const d = normalizeDate(date) || new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
};

const isSameDay = (a, b) => {
  const aa = normalizeDate(a);
  const bb = normalizeDate(b);
  if (!aa || !bb) return false;
  return aa.getTime() === bb.getTime();
};

const PropertyTimeline = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { properties } = useProperties();
  const { applications } = useApplications();
  const [view, setView] = useState('month');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showDetails, setShowDetails] = useState(true);
  const isPageLoading = usePageBootstrapLoading();

  const property = useMemo(
    () => properties.find((item) => String(item.propertyId) === String(propertyId)),
    [properties, propertyId]
  );

  const relatedApplication = useMemo(() => {
    if (!property) return null;
    const bySource = applications.find((app) => String(app?.id || '') === String(property?.sourceApplicationId || ''));
    if (bySource) return bySource;

    const matches = applications.filter((app) => {
      const appPropId = String(app?.property?.id || app?.propertyId || '');
      const sameProperty = appPropId && appPropId === String(property.propertyId);
      const sameUnit =
        String(app?.property?.unitCode || app?.unitCode || '') === String(property?.unitCode || '');
      return sameProperty || sameUnit;
    });
    if (!matches.length) return null;
    return matches.sort((a, b) => {
      const aDate = new Date(a?.updatedAtISO || a?.createdAtISO || 0).getTime();
      const bDate = new Date(b?.updatedAtISO || b?.createdAtISO || 0).getTime();
      return bDate - aDate;
    })[0];
  }, [applications, property]);

  const timelineEvents = useMemo(() => {
    if (!property) return [];
    const events = [];
    const push = (id, title, description, at, kind = 'info', type = 'event') => {
      events.push({ id, title, description, at, kind, type, date: parseAnyDate(at) });
    };

    if (relatedApplication?.createdAtISO) {
      push(
        'inspection-booked',
        'Inspection Booked',
        'Your inspection request was created for this unit.',
        relatedApplication.createdAtISO,
        'accent',
        'inspection'
      );
    }

    const inspectionStatus = relatedApplication?.inspectionStatus;
    if (inspectionStatus === INSPECTION_BOOKING_STATUSES.PENDING_CONFIRMATION) {
      push(
        'inspection-pending',
        'Inspection Pending Confirmation',
        'Admin has not confirmed this inspection slot yet.',
        relatedApplication?.updatedAtISO || relatedApplication?.createdAtISO,
        'warning',
        'inspection'
      );
    }
    if (inspectionStatus === INSPECTION_BOOKING_STATUSES.SCHEDULED) {
      push(
        'inspection-scheduled',
        'Inspection Scheduled',
        `Inspection scheduled for ${relatedApplication?.inspectionDate || 'selected date/time'}.`,
        relatedApplication?.inspectionDateISO || relatedApplication?.updatedAtISO,
        'success',
        'inspection'
      );
    }
    if (inspectionStatus === INSPECTION_BOOKING_STATUSES.NO_SHOW) {
      push(
        'inspection-no-show',
        'Inspection No-show',
        'Inspection was marked as no-show.',
        relatedApplication?.updatedAtISO,
        'danger',
        'inspection'
      );
    }
    if (inspectionStatus === INSPECTION_BOOKING_STATUSES.INSPECTION_COMPLETED) {
      push(
        'inspection-completed',
        'Inspection Completed',
        'Inspection was completed and verified at.',
        relatedApplication?.updatedAtISO || relatedApplication?.inspectionDateISO,
        'success',
        'inspection'
      );
    }

    const appStatus = relatedApplication?.status;
    const appStageIndex = APP_STAGE_ORDER.indexOf(appStatus);
    if (appStageIndex >= APP_STAGE_ORDER.indexOf('APPLICATION_STARTED')) {
      push(
        'application-started',
        'Application Started',
        'Application form process was started.',
        relatedApplication?.updatedAtISO || relatedApplication?.createdAtISO,
        'info',
        'application'
      );
    }
    if (appStageIndex >= APP_STAGE_ORDER.indexOf('APPLICATION_SUBMITTED')) {
      push(
        'application-submitted',
        'Application Submitted Date',
        'Application form process was started at.',
        relatedApplication?.updatedAtISO,
        'success',
        'application'
      );
    }
    if (appStageIndex >= APP_STAGE_ORDER.indexOf('UNDER_REVIEW')) {
      push(
        'application-review',
        'Under Review',
        'Application is being reviewed (SLA up to 72 hours).',
        relatedApplication?.updatedAtISO,
        'warning',
        'application'
      );
    }
    const inferredApprovedAt =
      relatedApplication?.decisionAtISO ||
      relatedApplication?.updatedAtISO ||
      relatedApplication?.createdAtISO ||
      property?.leaseStart ||
      property?.moveInChecklist?.moveInDate;

    const isApplicationApproved =
      appStatus === 'APPROVED' ||
      property?.tenancyStatus === 'PENDING_MOVE_IN' ||
      property?.tenancyStatus === 'ACTIVE';

    if (isApplicationApproved && inferredApprovedAt) {
      push(
        'application-approved',
        'Application Approved Date',
        'Application was approved at.',
        inferredApprovedAt,
        'success',
        'application'
      );
    }
    if (appStatus === 'REJECTED') {
      push(
        'application-rejected',
        'Verdict: Rejected',
        relatedApplication?.rejectionReason || 'Application did not meet requirements.',
        relatedApplication?.decisionAtISO || relatedApplication?.updatedAtISO,
        'danger',
        'application'
      );
    }
    if (appStatus === 'CANCELLED') {
      push(
        'application-cancelled',
        'Request Cancelled',
        'This request was cancelled and archived.',
        relatedApplication?.updatedAtISO,
        'danger',
        'application'
      );
    }

    if (property?.moveInChecklist?.moveInDate) {
      push(
        'move-in-date',
        'Move-in Date Submitted',
        `Move-in date captured as ${property.moveInChecklist.moveInDate}.`,
        property.moveInChecklist.moveInDate,
        'accent',
        'tenancy'
      );
    }

    if (property?.tenancyStatus === 'ACTIVE') {
      push(
        'tenancy-active',
        'Tenancy Active',
        `Your tenancy is now active for this unit and is supposed to end at ${formatDateTimeDDMMYYYY(property?.leaseEnd)}.`,
        property?.leaseStart || property?.moveInChecklist?.moveInDate,
        'success',
        'tenancy'
      );
    }

    if (property?.nextPayment?.dueDate) {
      push(
        'next-payment',
        'Next Payment Due',
        `${property?.nextPayment?.status || 'Upcoming'} payment is due.`,
        property.nextPayment.dueDate,
        'warning',
        'payment'
      );
    }

    if (property?.leaseEnd) {
      push(
        'lease-end',
        'Lease End Date',
        'Current lease period end date.',
        property.leaseEnd,
        'info',
        'lease'
      );
    }

    return events
      .filter((item) => item.date instanceof Date && !Number.isNaN(item.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [property, relatedApplication]);

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[#64748b]">Property not found.</p>
      </div>
    );
  }

  const monthLabel = `${MONTH_LONG[calendarDate.getMonth()]} ${calendarDate.getFullYear()}`;

  const getMonthDays = (date) => {
    const start = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = addDays(start, i);
      const inCurrentMonth = day.getMonth() === date.getMonth();
      const isToday = isSameDay(day, new Date());
      const dayEvents = timelineEvents.filter((evt) => isSameDay(evt.date, day));
      days.push({ day, inCurrentMonth, isToday, events: dayEvents });
    }
    return days;
  };

  const getWeekDays = (date) => {
    const start = startOfWeek(date);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i);
      const isToday = isSameDay(day, new Date());
      const dayEvents = timelineEvents.filter((evt) => isSameDay(evt.date, day));
      days.push({ day, isToday, events: dayEvents });
    }
    return days;
  };

  const goPrev = () => {
    if (view === 'month') {
      const d = new Date(calendarDate);
      d.setMonth(d.getMonth() - 1);
      setCalendarDate(d);
      return;
    }
    setCalendarDate(addDays(calendarDate, -7));
  };

  const goNext = () => {
    if (view === 'month') {
      const d = new Date(calendarDate);
      d.setMonth(d.getMonth() + 1);
      setCalendarDate(d);
      return;
    }
    setCalendarDate(addDays(calendarDate, 7));
  };

  const detailOrder = [
    'inspection-completed',
    'application-submitted',
    'application-approved',
    'move-in-date',
    'tenancy-active'
  ];

  const sortedDetails = detailOrder
    .map((eventId) => timelineEvents.find((event) => event.id === eventId))
    .filter(Boolean);

  return (
    <UnifiedPanelPage
      isLoading={isPageLoading}
      loadingConfig={{
        statsCount: 0,
        showFilterBar: false,
        cardCount: 4,
        grid: false
      }}
      title={
        <span className="inline-flex items-center gap-3">
          <button
            onClick={() => navigate(`/dashboard/rent/my-properties/${property.propertyId}`)}
            className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-[var(--surface-2,#f8fafc)]"
            style={{ color: 'var(--accent-color,#9F7539)' }}
            aria-label="Back to Property Overview"
            title="Back to Property Overview"
          >
            <ArrowLeft size={20} />
          </button>
          <span>Rental Timeline</span>
        </span>
      }
    >
      <UnifiedPanelSection>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[var(--text-color,#0e1f42)]">Rental Timeline Calendar</h3>
          <div className="flex items-center gap-2">
            <div
              className="property-timeline-toggle flex gap-1 rounded-lg p-1 timeline-toggle border border-[var(--border-color,#e2e8f0)]"
              style={{ backgroundColor: 'var(--surface-2,#f8fafc)' }}
            >
              {['month', 'week'].map((item) => (
                <button
                  key={item}
                  onClick={() => setView(item)}
                  className="px-2 py-1 text-xs font-medium rounded-md capitalize transition-colors"
                  style={{
                    backgroundColor: view === item ? 'var(--card-bg,#ffffff)' : 'transparent',
                    color: view === item ? 'var(--text-color,#0e1f42)' : 'var(--text-muted,#64748b)'
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDetails((prev) => !prev)}
              className="property-timeline-details-btn px-2 py-1 text-xs font-medium rounded-md transition-colors border border-[var(--border-color,#e2e8f0)]"
              style={{
                backgroundColor: 'var(--card-bg,#ffffff)',
                color: 'var(--text-color,#0e1f42)'
              }}
            >
              {showDetails ? 'Hide details' : 'Timeline details'}
            </button>
          </div>
        </div>

        <div
          className="property-timeline-surface rounded-xl p-4 border border-[var(--border-color,#e2e8f0)]"
          style={{ backgroundColor: 'var(--surface-2,#f8fafc)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={goPrev}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--text-muted,#64748b)' }}
            >
              <ChevronLeft size={14} />
            </button>
            <div className="text-sm font-bold text-[var(--text-color,#0e1f42)]">{monthLabel}</div>
            <button
              onClick={goNext}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--text-muted,#64748b)' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_OF_WEEK.map((day, dayIndex) => (
              <div key={`${day}-${dayIndex}`} className="text-center text-xs font-medium py-1 text-[var(--text-muted,#64748b)]">
                {day}
              </div>
            ))}
          </div>

          {view === 'month' ? (
            <div className="grid grid-cols-7 gap-1">
              {getMonthDays(calendarDate).map(({ day, inCurrentMonth, isToday, events: dayEvents }, idx) => (
                <div
                  key={idx}
                  className={`property-timeline-day text-center text-xs py-1.5 rounded cursor-default border border-transparent hover:border-[var(--border-color,#e2e8f0)] ${
                    isToday
                      ? 'bg-gradient-to-r from-[#0e1f42] to-[#1a2d5f] text-white font-bold'
                      : inCurrentMonth
                        ? 'text-[var(--text-color,#0e1f42)] hover:bg-[var(--surface-2,#f8fafc)]'
                        : 'text-[var(--text-muted,#64748b)] opacity-70'
                  }`}
                >
                  {day.getDate()}
                  {dayEvents.length > 0 && (
                    <div className="mt-1 flex justify-center gap-1">
                      {dayEvents.slice(0, 3).map((evt, i) => (
                        <span
                          key={`${evt.id}-${i}`}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: statusKindDot[evt.kind] || '#9f7539' }}
                        ></span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {getWeekDays(calendarDate).map(({ day, isToday, events: dayEvents }, idx) => (
                <div
                  key={idx}
                  className={`property-timeline-week-day text-center text-xs py-2 rounded cursor-default border border-[var(--border-color,#e2e8f0)] ${
                    isToday ? 'bg-gradient-to-r from-[#0e1f42] to-[#1a2d5f] text-white font-bold' : 'text-[var(--text-color,#0e1f42)]'
                  }`}
                  style={isToday ? undefined : { backgroundColor: 'var(--card-bg,#ffffff)' }}
                >
                  <div className="font-semibold">{day.getDate()}</div>
                  <div className="text-[10px] text-[var(--text-muted,#64748b)]">{MONTH_SHORT[day.getMonth()]}</div>
                  {dayEvents.length > 0 && (
                    <div className="mt-1 flex justify-center gap-1">
                      {dayEvents.slice(0, 3).map((evt, i) => (
                        <span
                          key={`${evt.id}-${i}`}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: statusKindDot[evt.kind] || '#9f7539' }}
                        ></span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </UnifiedPanelSection>

      <UnifiedPanelSection unstyled className="space-y-3">
        {showDetails ? (
          sortedDetails.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border-color,#e2e8f0)] p-6 text-center">
              <p className="text-base font-semibold text-[var(--text-color,#0e1f42)]">No timeline events yet</p>
              <p className="text-sm text-[var(--text-muted,#64748b)] mt-1">
                Events will appear here as you move from inspection to tenancy milestones.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedDetails.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-[var(--border-color,#e2e8f0)] p-4 flex items-start gap-3 bg-[var(--card-bg,#fff)]"
                >
                  <div className="pt-1">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: statusKindDot[event.kind] || '#9f7539' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm font-semibold text-[var(--text-color,#0e1f42)]">{event.title}</p>
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold border"
                        style={{
                          color: 'var(--accent-color,#9F7539)',
                          backgroundColor: 'rgba(159,117,57,0.15)',
                          borderColor: 'rgba(159,117,57,0.35)'
                        }}
                      >
                        {formatDateTimeDDMMYYYY(event.at)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted,#64748b)] mt-1">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border-color,#e2e8f0)] p-4 text-sm text-[var(--text-muted,#64748b)] text-center">
            Timeline details are hidden.
          </div>
        )}
      </UnifiedPanelSection>
    </UnifiedPanelPage>
  );
};

export default PropertyTimeline;
