import { httpRequest } from './httpClient';
import { createApiError, createApiSuccess } from './apiResult';
import { readJsonValue, writeJsonValue } from './localStorageAdapter';
import { getPublishedUnitListings } from '../adminListings';

const BROWSE_CACHE_KEY = 'domihive_browse_cache_v2';
const API_MODE = (import.meta?.env?.VITE_DOMIHIVE_API_MODE || 'local').toLowerCase();

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const readBrowseCache = async () => {
  const result = await readJsonValue({
    key: BROWSE_CACHE_KEY,
    fallback: { items: [], syncedAt: '' }
  });
  if (!result.ok) return result;

  const payload = result.data;
  if (!Array.isArray(payload?.items)) {
    return createApiSuccess({ items: [], syncedAt: '' }, { key: BROWSE_CACHE_KEY, cache: false });
  }

  return createApiSuccess(payload, { key: BROWSE_CACHE_KEY, cache: true });
};

const writeBrowseCache = async (payload) => {
  await writeJsonValue({ key: BROWSE_CACHE_KEY, value: payload });
};

const getBrowseSnapshotLocal = async ({ forceRefresh = false } = {}) => {
  if (!forceRefresh) {
    const cached = await readBrowseCache();
    if (cached.ok && Array.isArray(cached.data?.items) && cached.data.items.length > 0) {
      return createApiSuccess(
        {
          ...cached.data,
          source: 'cache'
        },
        {
          source: 'cache'
        }
      );
    }
  }

  await wait(220 + Math.floor(Math.random() * 260));
  const shouldFail = localStorage.getItem('domihive_mock_fail_browse') === '1';
  if (shouldFail) {
    return createApiError('Browse service unavailable. Try again.', 'BROWSE_UNAVAILABLE');
  }

  const items = getPublishedUnitListings();
  const payload = {
    items,
    syncedAt: new Date().toISOString(),
    source: 'admin-units'
  };
  await writeBrowseCache(payload);
  return createApiSuccess(payload, { source: 'local' });
};

const getBrowseSnapshotRemote = async ({ forceRefresh = false } = {}) => {
  const query = forceRefresh ? '?forceRefresh=1' : '';
  const response = await httpRequest({
    url: `/api/tenant/browse${query}`,
    method: 'GET'
  });
  if (!response.ok) return response;
  const payload = response.data;
  if (!Array.isArray(payload?.items)) {
    return createApiError('Invalid browse payload.', 'INVALID_BROWSE_PAYLOAD', payload);
  }
  await writeBrowseCache(payload);
  return createApiSuccess(payload, { source: 'remote' });
};

export const tenantApiClient = {
  mode: API_MODE,

  async getBrowseSnapshot(options = {}) {
    if (API_MODE === 'remote') {
      return getBrowseSnapshotRemote(options);
    }
    return getBrowseSnapshotLocal(options);
  },

  async readUserCollection({ key, fallback = [] }) {
    return readJsonValue({ key, fallback });
  },

  async writeUserCollection({ key, value, retrySanitizer }) {
    return writeJsonValue({ key, value, retrySanitizer });
  }
};
