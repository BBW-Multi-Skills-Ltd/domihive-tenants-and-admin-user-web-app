import React from 'react';

export const UnifiedPanelSection = ({ children, className = '', unstyled = false }) => {
  if (unstyled) {
    return <div className={className}>{children}</div>;
  }
  return (
    <div
      className={`rounded-xl shadow-sm border p-4 md:p-6 ${className}`.trim()}
      style={{
        backgroundColor: 'var(--card-bg,#ffffff)',
        borderColor: 'var(--border-color,#e2e8f0)'
      }}
    >
      {children}
    </div>
  );
};

const SkeletonBlock = ({ className = '', style = {} }) => (
  <div
    className={`animate-pulse rounded-md ${className}`.trim()}
    style={{ backgroundColor: 'rgba(148, 163, 184, 0.28)', ...style }}
  />
);

const DefaultContentSkeleton = ({ cardCount = 3, gridLayout = false }) => (
  <UnifiedPanelSection unstyled className="pt-1">
    <div className={gridLayout ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'grid gap-4'}>
      {Array.from({ length: Math.max(1, cardCount) }).map((_, index) => (
        <div
          key={`panel-loading-card-${index}`}
          className="rounded-xl border p-4 space-y-3"
          style={{
            backgroundColor: 'var(--card-bg,#ffffff)',
            borderColor: 'var(--border-color,#e2e8f0)'
          }}
        >
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-5 w-2/3" />
          <SkeletonBlock className="h-4 w-1/2" />
          <SkeletonBlock className="h-4 w-5/6" />
          <SkeletonBlock className="h-10 w-40" />
        </div>
      ))}
    </div>
  </UnifiedPanelSection>
);

const UnifiedPanelPage = ({
  title,
  subtitle,
  actions = null,
  stats = [],
  filterBar = null,
  children,
  className = '',
  isLoading = false,
  loadingConfig = {},
  loadingContent = null
}) => {
  const loadingStatsCount = Number(loadingConfig.statsCount ?? stats.length ?? 0) || 0;
  const showFilterSkeleton = Boolean(
    loadingConfig.showFilterBar !== undefined ? loadingConfig.showFilterBar : filterBar
  );
  const loadingCardCount = Number(loadingConfig.cardCount ?? 3) || 3;
  const loadingGrid = Boolean(loadingConfig.grid ?? false);

  return (
    <div
      className={`rent-overview-container bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-4 md:p-6 ${className}`.trim()}
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 leading-tight text-[var(--text-color,#0e1f42)]">{title}</h1>
            {subtitle ? <p className="text-sm text-[var(--text-muted,#64748b)]">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-3 text-sm">{actions}</div> : null}
        </div>

        {isLoading ? (
          <>
            {loadingStatsCount > 0 ? (
              <div className={`grid gap-3 md:gap-4 ${loadingStatsCount === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
                {Array.from({ length: loadingStatsCount }).map((_, index) => (
                  <div
                    key={`panel-loading-stat-${index}`}
                    className="rounded-lg p-4 shadow border"
                    style={{
                      backgroundColor: 'var(--card-bg,#ffffff)',
                      borderColor: 'var(--border-color,#e2e8f0)'
                    }}
                  >
                    <SkeletonBlock className="h-5 w-2/3 mb-3" />
                    <SkeletonBlock className="h-8 w-16 mb-2" />
                    <SkeletonBlock className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : null}

            {showFilterSkeleton ? (
              <UnifiedPanelSection>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <SkeletonBlock className="h-11 w-full md:max-w-md" />
                  <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
                    <SkeletonBlock className="h-11 w-[155px]" />
                    <SkeletonBlock className="h-11 w-[155px]" />
                    <SkeletonBlock className="h-5 w-28" />
                  </div>
                </div>
              </UnifiedPanelSection>
            ) : null}

            {loadingContent || <DefaultContentSkeleton cardCount={loadingCardCount} gridLayout={loadingGrid} />}
          </>
        ) : (
          <>
            {stats.length > 0 ? (
              <div className={`grid gap-3 md:gap-4 ${stats.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg p-4 shadow border flex items-center justify-between"
                      style={{
                        backgroundColor: 'var(--card-bg,#ffffff)',
                        borderColor: 'var(--border-color,#e2e8f0)'
                      }}
                    >
                      <div>
                        <div className="text-base md:text-[1.05rem] leading-tight font-medium text-[var(--text-muted,#64748b)]">{stat.label}</div>
                        <div className="text-2xl font-bold text-[var(--text-color,#0e1f42)]">{stat.value}</div>
                        {stat.meta ? <div className="text-xs text-[var(--text-muted,#64748b)]">{stat.meta}</div> : null}
                      </div>
                      {stat.icon ? (
                        <div
                          className={`rounded-lg p-2 ${stat.iconClass || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
                        >
                          {stat.icon}
                        </div>
                      ) : null}
                    </div>
                  ))}
              </div>
            ) : null}

            {filterBar ? <UnifiedPanelSection>{filterBar}</UnifiedPanelSection> : null}

            {children}
          </>
        )}
      </div>
    </div>
  );
};

export default UnifiedPanelPage;
