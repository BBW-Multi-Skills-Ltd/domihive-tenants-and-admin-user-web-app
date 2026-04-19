import { tenantApiClient } from '../../../shared/services/api/tenantApiClient';

export const fetchBrowseSnapshot = async ({ forceRefresh = false } = {}) => {
  const response = await tenantApiClient.getBrowseSnapshot({ forceRefresh });
  if (!response.ok) {
    throw new Error(response.error?.message || 'Browse service unavailable. Try again.');
  }
  return response.data;
};
