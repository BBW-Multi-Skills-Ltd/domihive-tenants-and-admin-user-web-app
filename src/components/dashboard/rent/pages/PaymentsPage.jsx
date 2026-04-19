import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ReceiptText, Search, Wallet } from 'lucide-react';
import UnifiedPanelPage, { UnifiedPanelSection } from '../../../shared/layout/UnifiedPanelPage';
import { usePayments } from '../contexts/PaymentsContext';
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
import { calculatePaymentsStats } from '../components/common/tenantStatCalculators';
import usePageBootstrapLoading from '../../../shared/hooks/usePageBootstrapLoading';

const PaymentsPage = () => {
  const navigate = useNavigate();
  const { rents, receipts, history } = usePayments();
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
    () => calculatePaymentsStats({ properties, rents, receipts, history }),
    [properties, rents, receipts, history]
  );

  return (
    <UnifiedPanelPage
      title="Payments"
      subtitle="Manage payment-ready units, then open workspace to pay rent and bills."
      isLoading={isPageLoading}
      loadingConfig={{
        statsCount: 3,
        showFilterBar: true,
        cardCount: isGrid ? 6 : 4,
        grid: isGrid
      }}
      stats={createTenantStats([
        {
          label: 'Units',
          value: stats.unitsCount,
          meta: `${stats.unitsCount} total`,
          icon: <Wallet size={20} />,
          tone: 'info'
        },
        {
          label: 'Due Now',
          value: stats.dueNow,
          meta: `${stats.dueNow} payable`,
          icon: <CreditCard size={20} />,
          tone: 'warning'
        },
        {
          label: 'Receipts',
          value: stats.receiptsCount,
          meta: `${stats.receiptsCount} records`,
          icon: <ReceiptText size={20} />,
          tone: 'success'
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
                minWidth={175}
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
                      label="Make Payment"
                      onClick={() => navigate(`/dashboard/rent/payments/${property.propertyId}`)}
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

export default PaymentsPage;
