import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApplicationCard from '../components/applications/ApplicationCard';
import { useApplications } from '../contexts/ApplicationsContext';
import UnifiedPanelPage, { UnifiedPanelSection } from '../../../shared/layout/UnifiedPanelPage';
import { FilePlus2, FileClock, CheckCircle2 } from 'lucide-react';
import { useUnitCardView } from '../contexts/UnitCardViewContext';
import {
  TenantPageEmptyState,
  TenantPageFilterBar,
  TenantPageResultsCount,
  TenantPageSearchInput,
  TenantPageSelect
} from '../components/common/TenantPageControls';
import {
  APPLICATION_STATUS_FILTER_OPTIONS,
  SORT_ORDER_OPTIONS
} from '../components/common/tenantFilters';
import { createTenantStats } from '../components/common/tenantStats';
import {
  ACTIVE_APPLICATION_STATUSES,
  calculateApplicationsSummary
} from '../components/common/tenantStatCalculators';
import usePageBootstrapLoading from '../../../shared/hooks/usePageBootstrapLoading';

const RentApplications = () => {
  const navigate = useNavigate();
  const { applications, updateApplication, addNotification } = useApplications();
  const { viewType, isGrid } = useUnitCardView();
  const isPageLoading = usePageBootstrapLoading();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [sortBy, setSortBy] = useState('newest');

  const handleCardAction = (application, actionMeta = null) => {
    if (actionMeta?.type === 'inspection_completed_continue') {
      updateApplication(application.id, { status: 'APPLICATION_STARTED', updatedAt: 'Just now' });
      addNotification({
        type: 'application',
        title: 'Application Started',
        message: `${application.property.title} is ready. Complete your application form and payment.`,
        cta: { label: 'Continue Application', path: `/dashboard/rent/applications/${application.id}/start` }
      });
      navigate(`/dashboard/rent/applications/${application.id}/start`);
      return;
    }

    if (
      actionMeta?.type === 'reschedule_no_show' ||
      actionMeta?.type === 'inspection_completed_reschedule'
    ) {
      updateApplication(application.id, {
        status: 'INSPECTION_SCHEDULED',
        inspectionStatus: 'Pending Confirmation',
        updatedAt: 'Just now'
      });
      addNotification({
        type: 'inspection',
        title: 'Reschedule Requested',
        message: `Reschedule requested for ${application.property.title}. Pick a new slot to continue.`,
        cta: { label: 'Browse Properties', path: '/dashboard/rent/browse' }
      });
      navigate('/dashboard/rent/browse');
      return;
    }

    if (
      actionMeta?.type === 'not_interested_no_show' ||
      actionMeta?.type === 'inspection_completed_not_interested' ||
      actionMeta?.type === 'inspection_completed_missed_cancel'
    ) {
      updateApplication(application.id, { status: 'CANCELLED', updatedAt: 'Just now' });
      setStatusFilter('cancelled');
      addNotification({
        type: 'application',
        title: 'Request Closed',
        message: `${application.property.title} inspection request has been closed.`,
        cta: { label: 'View Cancelled Requests', path: '/dashboard/rent/applications' }
      });
      return;
    }

    switch (application.status) {
      case 'INSPECTION_VERIFIED':
      case 'APPLICATION_STARTED':
        navigate(`/dashboard/rent/applications/${application.id}/start`);
        break;
      case 'APPLICATION_SUBMITTED':
      case 'UNDER_REVIEW':
      case 'APPROVED':
      case 'REJECTED':
      case 'CANCELLED':
        navigate(`/dashboard/rent/applications/${application.id}/track`);
        break;
      default:
        break;
    }
  };

  const filteredApplications = useMemo(() => {
    let list = [...applications];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((app) =>
        `${app.applicantName || ''} ${app.property?.title || ''} ${app.id || ''}`.toLowerCase().includes(q)
      );
    }

    if (statusFilter === 'active') {
      list = list.filter((app) => ACTIVE_APPLICATION_STATUSES.includes(app.status));
    } else if (statusFilter === 'approved') {
      list = list.filter((app) => app.status === 'APPROVED');
    } else if (statusFilter === 'rejected') {
      list = list.filter((app) => app.status === 'REJECTED');
    } else if (statusFilter === 'cancelled') {
      list = list.filter((app) => app.status === 'CANCELLED');
    } else {
      list = list.filter((app) => app.status === statusFilter);
    }

    list.sort((a, b) => {
      const da = new Date(a.submittedAt || a.createdAt || 0).getTime();
      const db = new Date(b.submittedAt || b.createdAt || 0).getTime();
      return sortBy === 'oldest' ? da - db : db - da;
    });

    return list;
  }, [applications, search, statusFilter, sortBy]);

  const summaryStats = useMemo(() => calculateApplicationsSummary(applications), [applications]);

  return (
    <UnifiedPanelPage
      title="My Applications"
      subtitle="Track inspection → application → payment → decision."
      stats={createTenantStats([
        {
          label: 'Total Applications',
          value: summaryStats.total,
          meta: `${summaryStats.total} applications`,
          icon: <FilePlus2 size={20} />,
          tone: 'neutral'
        },
        {
          label: 'Actionable',
          value: summaryStats.pending,
          meta: `${summaryStats.pending} in progress`,
          icon: <FileClock size={20} />,
          tone: 'warning'
        },
        {
          label: 'Submitted',
          value: summaryStats.submitted,
          meta: `${summaryStats.submitted} submitted`,
          icon: <CheckCircle2 size={20} />,
          tone: 'success'
        }
      ])}
      className="applications-page"
      isLoading={isPageLoading}
      loadingConfig={{
        statsCount: 3,
        showFilterBar: true,
        cardCount: isGrid ? 6 : 4,
        grid: isGrid
      }}
      filterBar={
        <TenantPageFilterBar
          left={(
            <TenantPageSearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applicant, property..."
            />
          )}
          right={(
            <>
            <TenantPageSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              minWidth={155}
            >
              {APPLICATION_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </TenantPageSelect>
            <TenantPageSelect
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              minWidth={155}
            >
              {SORT_ORDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </TenantPageSelect>
            <TenantPageResultsCount value={filteredApplications.length} label="applications" className="whitespace-nowrap" />
            </>
          )}
        />
      }
    >
      <UnifiedPanelSection unstyled className="pt-1">
        <div className={isGrid ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'grid gap-4'}>
          {filteredApplications.length === 0 ? (
            <TenantPageEmptyState
              className="rounded-2xl p-6 text-center"
              title="No applications found"
              description="Try another status filter or book an inspection from Browse Properties."
            />
          ) : (
            filteredApplications.map((application) => (
              <div key={application.id} className="w-full">
                <ApplicationCard
                  application={application}
                  onAction={handleCardAction}
                  compact
                  viewType={viewType}
                />
              </div>
            ))
          )}
        </div>
      </UnifiedPanelSection>
    </UnifiedPanelPage>
  );
};

export default RentApplications;
