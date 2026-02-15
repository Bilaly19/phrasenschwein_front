import axios from 'axios';
import { resolveApiBaseUrl } from './config';
import { fromAxiosError } from './errors';
import { getAuthToken, useAuth } from '../stores/auth';

const apiBaseUrl = resolveApiBaseUrl();

const shouldHandleAsAuthFailure = (status, url = '') => {
    if (status !== 401) return false;
    const normalized = String(url || '');
    return !normalized.endsWith('/api/login') && !normalized.endsWith('/api/register');
};

const requiresAuth = (url = '') => {
    const normalized = String(url || '');
    if (!normalized.startsWith('/api/')) return false;
    if (normalized === '/api/login' || normalized === '/api/register') return false;
    return true;
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
    if (!config.headers) {
        config.headers = {};
    }

    if (token && requiresAuth(config?.url)) {
        config.headers.Authorization = `Bearer ${token}`;
    } else {
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
            const { clearAuthState } = useAuth();
            clearAuthorizationToken();
            clearAuthState();
            normalizedError.userMessage = 'Deine Sitzung ist abgelaufen. Bitte logge dich erneut ein.';
            window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: normalizedError.userMessage }));
        }

        if (normalizedError.status === 403) {
            normalizedError.userMessage = 'nicht erlaubt';
        }

        return Promise.reject(normalizedError);
    }
);
