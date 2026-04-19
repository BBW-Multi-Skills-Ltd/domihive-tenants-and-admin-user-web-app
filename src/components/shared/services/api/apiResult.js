export const createApiSuccess = (data, meta = {}) => ({
  ok: true,
  data,
  error: null,
  meta
});

export const createApiError = (message, code = 'UNKNOWN_ERROR', details = null) => ({
  ok: false,
  data: null,
  error: {
    code,
    message: String(message || 'Something went wrong.'),
    details
  },
  meta: {}
});
