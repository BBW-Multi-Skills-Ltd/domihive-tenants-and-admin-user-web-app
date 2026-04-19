import { createApiError, createApiSuccess } from './apiResult';

const DEFAULT_RETRY_SANITIZER = (value) => value;

const safeParse = (raw, fallback) => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return fallback;
  }
};

export const readJsonValue = async ({ key, fallback = null }) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return createApiSuccess(fallback, { source: 'localStorage', key, isFallback: true });
    }
    const parsed = safeParse(raw, fallback);
    return createApiSuccess(parsed, { source: 'localStorage', key, isFallback: parsed === fallback });
  } catch (error) {
    return createApiError('Could not read local data.', 'LOCAL_READ_FAILED', {
      key,
      cause: error
    });
  }
};

export const writeJsonValue = async ({
  key,
  value,
  retrySanitizer = DEFAULT_RETRY_SANITIZER
}) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return createApiSuccess(true, { source: 'localStorage', key, compacted: false });
  } catch (error) {
    try {
      const compacted = retrySanitizer(value);
      localStorage.setItem(key, JSON.stringify(compacted));
      return createApiSuccess(true, { source: 'localStorage', key, compacted: true });
    } catch (retryError) {
      return createApiError('Could not persist local data.', 'LOCAL_WRITE_FAILED', {
        key,
        cause: retryError,
        originalError: error
      });
    }
  }
};

export const removeValue = async ({ key }) => {
  try {
    localStorage.removeItem(key);
    return createApiSuccess(true, { source: 'localStorage', key });
  } catch (error) {
    return createApiError('Could not remove local data.', 'LOCAL_REMOVE_FAILED', {
      key,
      cause: error
    });
  }
};
