import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProperties } from '../contexts/PropertiesContext';
import PropertyCard from '../components/properties/PropertyCard';
import UnifiedPanelPage, { UnifiedPanelSection } from '../../../shared/layout/UnifiedPanelPage';
import { Building2, Clock3, Wallet } from 'lucide-react';
import { useUnitCardView } from '../contexts/UnitCardViewContext';
import {
  TenantPageEmptyState,
  TenantPageFilterBar,
  TenantPageResultsCount,
  TenantPageSearchInput,
  TenantPageSelect
} from '../components/common/TenantPageControls';
import {
  filterPropertiesByTenancyAndSearch,
  LEASE_WINDOW_FILTER_OPTIONS,
  MY_PROPERTIES_STATUS_FILTER_OPTIONS
} from '../components/common/tenantFilters';
import { createTenantStats } from '../components/common/tenantStats';
import { calculateMyPropertiesStats } from '../components/common/tenantStatCalculators';
import usePageBootstrapLoading from '../../../shared/hooks/usePageBootstrapLoading';

const MyProperties = () => {
  const navigate = useNavigate();
  const { properties } = useProperties();
  const { viewType, isGrid } = useUnitCardView();
  const isPageLoading = usePageBootstrapLoading();
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [leaseFilter, setLeaseFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');

  const visibleProperties = React.useMemo(() => {
    let list = filterPropertiesByTenancyAndSearch(properties, {
      tenancyFilter: statusFilter,
      search,
      searchFields: ['name', 'location', 'unitCode', 'unitType']
    });

    if (leaseFilter === 'endingSoon') {
      const now = new Date();
      list = list.filter((p) => {
        if (!p.leaseEnd) return false;
        const end = new Date(p.leaseEnd);
        if (Number.isNaN(end.getTime())) return false;
        const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 60;
      });
    }

    return list;
  }, [properties, search, statusFilter, leaseFilter]);

  const stats = React.useMemo(() => calculateMyPropertiesStats(visibleProperties), [visibleProperties]);

  const handleAction = (property, action) => {
    const base = `/dashboard/rent/my-properties/${property.propertyId}`;
    switch (action) {
      case 'movein':
        navigate(base, { state: { focus: 'movein' } });
        break;
      case 'payments':
        navigate(`${base}/payments`);
        break;
      case 'lease-management':
        navigate(`${base}/lease-management`);
        break;
      case 'refund':
        navigate(base, { state: { focus: 'refund' } });
        break;
      default:
        navigate(base);
    }
  };

  return (
    <UnifiedPanelPage
      title="My Properties"
      subtitle="Manage active tenancies, payments, and move-in/out steps."
      isLoading={isPageLoading}
      loadingConfig={{
        statsCount: 3,
        showFilterBar: true,
        cardCount: isGrid ? 6 : 4,
        grid: isGrid
      }}
      stats={createTenantStats([
        {
          label: 'Active Properties',
          value: stats.active,
          meta: `${stats.active} active`,
          icon: <Building2 size={20} />,
          tone: 'success'
        },
        {
          label: 'Pending Move-in',
          value: stats.pending,
          meta: `${stats.pending} pending`,
          icon: <Clock3 size={20} />,
          tone: 'warning'
        },
        {
          label: 'Upcoming Payments',
          value: stats.upcomingPayments,
          meta: `${stats.upcomingPayments} upcoming`,
          icon: <Wallet size={20} />,
          tone: 'info'
        }
      ])}
      filterBar={
        <TenantPageFilterBar
          left={(
            <TenantPageSearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search property, unit, location..."
            />
          )}
          right={(
            <>
              <TenantPageSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                minWidth={155}
              >
              {MY_PROPERTIES_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              </TenantPageSelect>
              <TenantPageSelect
                value={leaseFilter}
                onChange={(e) => setLeaseFilter(e.target.value)}
                minWidth={185}
              >
              {LEASE_WINDOW_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              </TenantPageSelect>
              <TenantPageResultsCount value={visibleProperties.length} label="properties" />
            </>
          )}
        />
      }
    >
      <UnifiedPanelSection unstyled className="pt-1">
        <div className={isGrid ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'grid gap-4'}>
          {visibleProperties.length === 0 ? (
            <TenantPageEmptyState
              className="rounded-2xl p-6 text-center"
              title="No active tenancy yet"
              description="Complete inspection, submit application, and wait for approval to see your property here."
            />
          ) : (
            visibleProperties.map((property) => (
              <PropertyCard
                key={property.propertyId}
                property={property}
                onAction={handleAction}
                viewType={viewType}
              />
            ))
          )}
        </div>
      </UnifiedPanelSection>
    </UnifiedPanelPage>
  );
};

export default MyProperties;
