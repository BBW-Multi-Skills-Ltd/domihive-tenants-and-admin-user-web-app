import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ClipboardList, Search, Wrench } from 'lucide-react';
import UnifiedPanelPage, { UnifiedPanelSection } from '../../../shared/layout/UnifiedPanelPage';
import { useMaintenance } from '../contexts/MaintenanceContext';
import { useProperties } from '../contexts/PropertiesContext';
import TenantUnitCard from '../components/common/TenantUnitCard';
import StatusBadge from '../components/common/StatusBadge';
import { useUnitCardView } from '../contexts/UnitCardViewContext';
import {
  TenantPageEmptyState,
  TenantPageFilterBar,
  TenantPageResultsCount,
  TenantPageSearchInput,
  TenantPageSelect
} from '../components/common/TenantPageControls';
import TenantCardActionButton from '../components/common/TenantCardActionButton';
import { getTenancyStatusLabel } from '../components/common/tenancyStatus';
import {
  filterPropertiesByTenancyAndSearch,
  TENANCY_FILTER_OPTIONS
} from '../components/common/tenantFilters';
import { createTenantStats } from '../components/common/tenantStats';
import { calculateMaintenanceStats } from '../components/common/tenantStatCalculators';
import usePageBootstrapLoading from '../../../shared/hooks/usePageBootstrapLoading';

const MaintenancePage = () => {
  const navigate = useNavigate();
  const { tickets } = useMaintenance();
  const { properties } = useProperties();
  const { viewType, isGrid } = useUnitCardView();
  const isPageLoading = usePageBootstrapLoading();

  const [propertySearch, setPropertySearch] = useState('');
  const [tenancyFilter, setTenancyFilter] = useState('all');

  const filteredProperties = useMemo(() => {
    return filterPropertiesByTenancyAndSearch(properties, {
      tenancyFilter,
      search: propertySearch
    });
  }, [properties, tenancyFilter, propertySearch]);

  const stats = useMemo(
    () => calculateMaintenanceStats({ properties, tickets }),
    [properties, tickets]
  );

  return (
    <UnifiedPanelPage
      title="Maintenance"
      subtitle="Raise and track maintenance requests for your units."
      isLoading={isPageLoading}
      loadingConfig={{
        statsCount: 3,
        showFilterBar: true,
        cardCount: isGrid ? 6 : 4,
        grid: isGrid
      }}
      stats={createTenantStats([
        {
          label: 'Managed Units',
          value: stats.propertiesCount,
          meta: `${stats.propertiesCount} available`,
          icon: <ClipboardList size={20} />,
          tone: 'info'
        },
        {
          label: 'Open Requests',
          value: stats.openRequests,
          meta: `${stats.openRequests} ongoing`,
          icon: <Wrench size={20} />,
          tone: 'warning'
        },
        {
          label: 'Emergency',
          value: stats.emergencyCount,
          meta: `${stats.emergencyCount} urgent`,
          icon: <AlertTriangle size={20} />,
          tone: 'error'
        }
      ])}
      filterBar={
        <TenantPageFilterBar
          left={(
            <TenantPageSearchInput
              value={propertySearch}
              onChange={(e) => setPropertySearch(e.target.value)}
              placeholder="Search property, location, description..."
            />
          )}
          right={(
            <>
              <TenantPageSelect
                value={tenancyFilter}
                onChange={(e) => setTenancyFilter(e.target.value)}
                minWidth={165}
              >
              {TENANCY_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              </TenantPageSelect>
              <TenantPageResultsCount value={filteredProperties.length} />
            </>
          )}
        />
      }
    >
      <UnifiedPanelSection unstyled className="pt-1">
        <div className={isGrid ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-4'}>
          {filteredProperties.length === 0 ? (
            <TenantPageEmptyState title="No unit matched your filter." />
          ) : (
            filteredProperties.map((property) => {
              const price = Number(property.rentAmount || property.price || property.nextPayment?.amount || 0);
              const isMoveInPending = property.tenancyStatus === 'PENDING_MOVE_IN';
              return (
                <TenantUnitCard
                  key={property.propertyId}
                  viewType={viewType}
                  image={property.image}
                  imageAlt={property.name || 'Property'}
                  price={price}
                  title={property.name || 'Property'}
                  location={property.location || 'Location not available'}
                  bedrooms={property.bedrooms}
                  bathrooms={property.bathrooms}
                  size={property.size}
                  description={property.description}
                  badge={
                    <StatusBadge
                      status={property.tenancyStatus}
                      label={getTenancyStatusLabel(property.tenancyStatus, 'Ended')}
                    />
                  }
                  actions={
                    <TenantCardActionButton
                      label="Request Maintenance"
                      onClick={() =>
                        navigate('/dashboard/rent/maintenance/request', {
                          state: { propertyId: property.propertyId }
                        })
                      }
                      disabled={isMoveInPending}
                      helperText="Complete move-in checklist first"
                    />
                  }
                />
              );
            })
          )}
        </div>
      </UnifiedPanelSection>
    </UnifiedPanelPage>
  );
};

export default MaintenancePage;
