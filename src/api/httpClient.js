import axios from 'axios';
import { resolveApiBaseUrl } from './config';
import { fromAxiosError } from './errors';
import { getAuthToken, useAuth } from '../stores/auth';

const apiBaseUrl = resolveApiBaseUrl();

const resolveRequestPath = (url = '') => {
    const normalizedUrl = String(url || '').trim();
    if (!normalizedUrl) return '';

    try {
        const fallbackBase = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
        return new URL(normalizedUrl, apiBaseUrl || fallbackBase).pathname;
    } catch {
        return normalizedUrl.split('?')[0];
    }
};

const isAuthExemptPath = (url = '') => {
    const path = resolveRequestPath(url);
    return path === '/api/login' || path === '/api/register';
};

const shouldHandleAsAuthFailure = (status, url = '') => {
    if (status !== 401) return false;
    return !isAuthExemptPath(url);
};

const requiresAuth = (url = '') => {
    const path = resolveRequestPath(url);
    if (!path.startsWith('/api/')) return false;
    return !isAuthExemptPath(path);
};

const authDebug = (...args) => {
    if (import.meta.env.DEV) {
        console.debug(...args);
    }
};

export const httpClient = axios.create({
    baseURL: apiBaseUrl,
    withCredentials: true
});

export const clearAuthorizationToken = () => {
    delete httpClient.defaults.headers.common.Authorization;
};

httpClient.interceptors.request.use((config) => {
    const token = getAuthToken();
    const requestPath = resolveRequestPath(config?.url);
    const isProtectedRequest = requiresAuth(requestPath);
    const isAuthExemptRequest = isAuthExemptPath(requestPath);

    authDebug('[auth] interceptor token read:', token ? 'present' : 'missing', requestPath || config?.url || '<unknown>');

    if (!config.headers) {
        config.headers = {};
    }

    if (isProtectedRequest) {
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            delete config.headers.Authorization;
        }
    } else if (isAuthExemptRequest) {
        delete config.headers.Authorization;
    }

    return config;
});

httpClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const normalizedError = fromAxiosError(error);
        const requestUrl = error?.config?.url || '';

        if (shouldHandleAsAuthFailure(normalizedError.status, requestUrl)) {
            const { reset } = useAuth();
            clearAuthorizationToken();
            reset();
            normalizedError.userMessage = 'Deine Sitzung ist abgelaufen. Bitte logge dich erneut ein.';
            window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: normalizedError.userMessage }));
        }

        if (normalizedError.status === 403) {
            normalizedError.userMessage = 'nicht erlaubt';
        }

        return Promise.reject(normalizedError);
    }
);
