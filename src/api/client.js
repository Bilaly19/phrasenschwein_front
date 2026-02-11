import axios from 'axios';
import { getAuthToken, useAuth } from '../stores/auth';

const AUTH_HEADER_MODE = import.meta.env.VITE_AUTH_HEADER_MODE || 'raw';

const toAuthHeaderValue = (token) => {
  if (!token) return '';
  return AUTH_HEADER_MODE === 'bearer' ? `Bearer ${token}` : token;
};

const buildErrorMessage = (data, fallback = 'Ein unerwarteter Fehler ist aufgetreten.') => {
  if (!data) return fallback;

  if (typeof data === 'string') return data;

  const message = data.message || fallback;
  if (data.details && typeof data.details === 'object') {
    const detailText = Object.entries(data.details)
      .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join(' | ');

    return detailText ? `${message} (${detailText})` : message;
  }

  return message;
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = toAuthHeaderValue(token);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const { logout } = useAuth();
    const status = error.response?.status;
    const payload = error.response?.data;

    if (status === 401) {
      logout();
      error.userMessage = 'Deine Sitzung ist abgelaufen. Bitte logge dich erneut ein.';
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: error.userMessage }));
    } else if (status === 429) {
      error.userMessage = 'Zu viele Versuche. Bitte warte kurz und versuche es erneut.';
    } else if (status === 400) {
      error.userMessage = buildErrorMessage(payload, 'Ungültige Eingabe.');
    } else {
      error.userMessage = buildErrorMessage(payload, error.message);
    }

    return Promise.reject(error);
  }
);

export const getErrorMessage = (error, fallback = 'Ein Fehler ist aufgetreten.') => {
  return error?.userMessage || buildErrorMessage(error?.response?.data, fallback);
};
