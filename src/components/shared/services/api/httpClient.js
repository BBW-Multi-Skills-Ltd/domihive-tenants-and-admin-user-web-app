import { createApiError, createApiSuccess } from './apiResult';

const DEFAULT_TIMEOUT_MS = 12000;

export const httpRequest = async ({
  url,
  method = 'GET',
  headers = {},
  body,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  credentials = 'include'
}) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials,
      signal: controller.signal
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (_parseError) {
      payload = null;
    }

    if (!response.ok) {
      return createApiError(
        payload?.message || `Request failed with ${response.status}`,
        payload?.code || `HTTP_${response.status}`,
        payload
      );
    }

    return createApiSuccess(payload, {
      status: response.status
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return createApiError('Request timed out.', 'TIMEOUT', error);
    }
    return createApiError(error?.message || 'Network request failed.', 'NETWORK_ERROR', error);
  } finally {
    window.clearTimeout(timer);
  }
};
