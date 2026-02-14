const FALLBACK_MESSAGE = 'Ein Fehler ist aufgetreten.';

export class ApiError extends Error {
  constructor({ status = 0, code = 'UNKNOWN_ERROR', message = FALLBACK_MESSAGE, details = [], requestId = null }) {
    super(message || FALLBACK_MESSAGE);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.userMessage = message || FALLBACK_MESSAGE;
  }
}

export const fromAxiosError = (error) => {
  const status = error?.response?.status || 0;
  const payload = error?.response?.data;

  if (payload?.ok === false && payload?.error) {
    const backendError = payload.error;
    const baseMessage = backendError.message || FALLBACK_MESSAGE;
    return new ApiError({
      status,
      code: backendError.code || 'UNKNOWN_ERROR',
      message: baseMessage,
      details: backendError.details || [],
      requestId: backendError.requestId || null
    });
  }

  if (typeof payload?.message === 'string' && payload.message) {
    return new ApiError({
      status,
      code: payload.code || 'UNKNOWN_ERROR',
      message: payload.message
    });
  }

  return new ApiError({
    status,
    code: 'NETWORK_OR_SERVER_ERROR',
    message: error?.message || FALLBACK_MESSAGE
  });
};

export const getErrorMessage = (error, fallback = FALLBACK_MESSAGE) => {
  if (error?.userMessage) return error.userMessage;
  if (typeof error?.message === 'string' && error.message) return error.message;
  return fallback;
};
