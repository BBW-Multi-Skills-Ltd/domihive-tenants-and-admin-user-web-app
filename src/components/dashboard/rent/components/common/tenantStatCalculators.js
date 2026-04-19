const asUpper = (value) => String(value || '').toUpperCase();
const asLower = (value) => String(value || '').toLowerCase();

const countWhere = (items = [], predicate = () => false) => {
  return items.reduce((total, item) => (predicate(item) ? total + 1 : total), 0);
};

export const ACTIVE_APPLICATION_STATUSES = Object.freeze([
  'INSPECTION_SCHEDULED',
  'INSPECTION_VERIFIED',
  'APPLICATION_STARTED',
  'APPLICATION_SUBMITTED',
  'UNDER_REVIEW'
]);

export const calculateMyPropertiesStats = (properties = []) => {
  return {
    active: countWhere(properties, (item) => item?.tenancyStatus === 'ACTIVE'),
    pending: countWhere(properties, (item) => item?.tenancyStatus === 'PENDING_MOVE_IN'),
    upcomingPayments: countWhere(properties, (item) => Boolean(item?.nextPayment))
  };
};

export const calculateMaintenanceStats = ({ properties = [], tickets = [] } = {}) => {
  const activeTickets = tickets.filter((item) => {
    const status = asUpper(item?.status);
    return !['COMPLETED', 'CANCELLED'].includes(status);
  });

  return {
    propertiesCount: properties.length,
    openRequests: activeTickets.length,
    emergencyCount: countWhere(activeTickets, (item) => asLower(item?.urgency).includes('emergency'))
  };
};

export const calculatePaymentsStats = ({ properties = [], rents = {}, receipts = [], history = [] } = {}) => {
  const dueNow = Object.values(rents || {}).filter((rent) => {
    const status = String(rent?.status || '');
    return status === 'Due' || status === 'Overdue';
  }).length;

  return {
    unitsCount: properties.length,
    dueNow,
    receiptsCount: receipts.length,
    historyCount: history.length
  };
};

export const calculateMessageStats = (threads = []) => {
  return {
    totalThreads: threads.length,
    open: countWhere(threads, (item) => asUpper(item?.status) === 'OPEN'),
    resolved: countWhere(threads, (item) => asUpper(item?.status) === 'RESOLVED')
  };
};

export const calculateFavoritesStats = (favoriteProperties = []) => {
  return {
    total: favoriteProperties.length,
    available: countWhere(favoriteProperties, (item) =>
      ['vacant', 'available'].includes(asLower(item?.tenantStatus || item?.status))
    ),
    occupied: countWhere(favoriteProperties, (item) =>
      ['occupied', 'rented'].includes(asLower(item?.tenantStatus || item?.status))
    )
  };
};

export const calculateApplicationsSummary = (applications = []) => {
  return {
    total: applications.length,
    pending: countWhere(applications, (item) =>
      ['INSPECTION_SCHEDULED', 'INSPECTION_VERIFIED', 'APPLICATION_STARTED'].includes(item?.status)
    ),
    submitted: countWhere(applications, (item) =>
      item?.status === 'APPLICATION_SUBMITTED' || item?.status === 'UNDER_REVIEW'
    )
  };
};

export const calculateOverviewStats = ({ applications = [], properties = [], threads = [] } = {}) => {
  return {
    activeApplications: countWhere(applications, (item) => ACTIVE_APPLICATION_STATUSES.includes(item?.status)),
    upcomingInspections: countWhere(applications, (item) => item?.status === 'INSPECTION_SCHEDULED'),
    activeProperties: countWhere(properties, (item) => ['ACTIVE', 'PENDING_MOVE_IN'].includes(item?.tenancyStatus)),
    unreadMessages: threads.reduce((sum, item) => sum + Number(item?.unreadCount || 0), 0)
  };
};
