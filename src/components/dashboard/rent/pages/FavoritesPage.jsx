import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Heart, Home } from 'lucide-react';
import { useProperties } from '../contexts/PropertiesContext';
import PropertyGrid from '../components/browse-properties/components/PropertyGrid/PropertyGrid';
import UnifiedPanelPage, { UnifiedPanelSection } from '../../../shared/layout/UnifiedPanelPage';
import { useUnitCardView } from '../contexts/UnitCardViewContext';
import { TenantPageEmptyState } from '../components/common/TenantPageControls';
import { createTenantStats } from '../components/common/tenantStats';
import { calculateFavoritesStats } from '../components/common/tenantStatCalculators';
import usePageBootstrapLoading from '../../../shared/hooks/usePageBootstrapLoading';

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { favoriteProperties, toggleFavorite, isFavorite } = useProperties();
  const { viewType, isGrid } = useUnitCardView();
  const isPageLoading = usePageBootstrapLoading();

  const handleFavoriteToggle = (property) => toggleFavorite(property);

  const stats = useMemo(() => calculateFavoritesStats(favoriteProperties), [favoriteProperties]);

  return (
    <UnifiedPanelPage
      title="Favorites"
      subtitle="Saved units from your browse journey."
      isLoading={isPageLoading}
      loadingConfig={{
        statsCount: 3,
        showFilterBar: false,
        cardCount: isGrid ? 6 : 4,
        grid: isGrid
      }}
      stats={createTenantStats([
        {
          label: 'Saved Units',
          value: stats.total,
          meta: `${stats.total} total`,
          icon: <Heart size={18} />,
          tone: 'info'
        },
        {
          label: 'Available',
          value: stats.available,
          meta: `${stats.available} ready to book`,
          icon: <CheckCircle2 size={18} />,
          tone: 'success'
        },
        {
          label: 'Occupied',
          value: stats.occupied,
          meta: `${stats.occupied} unavailable`,
          icon: <Home size={18} />,
          tone: 'error'
        }
      ])}
    >
      {favoriteProperties.length === 0 ? (
        <UnifiedPanelSection>
          <TenantPageEmptyState
            title="No favorites yet"
            description="Browse properties and tap the heart icon to save units you like."
          />
        </UnifiedPanelSection>
      ) : (
        <UnifiedPanelSection>
          <PropertyGrid
            properties={favoriteProperties.map((p) => ({
              ...p,
              isFavorite: isFavorite(p.id || p.propertyId)
            }))}
            viewType={viewType}
            onFavoriteToggle={handleFavoriteToggle}
            onPropertyClick={(propertyId) =>
              navigate('/dashboard/rent/browse', { state: { openPropertyId: propertyId } })
            }
            onBookNowClick={(propertyId) =>
              navigate('/dashboard/rent/browse', { state: { openPropertyId: propertyId } })
            }
          />
          {isGrid ? <div className="h-1"></div> : null}
        </UnifiedPanelSection>
      )}
    </UnifiedPanelPage>
  );
};

export default FavoritesPage;
