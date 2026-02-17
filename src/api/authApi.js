import { httpClient } from './httpClient';

const unwrapPayload = (response) => {
    const body = response?.data;
    if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'ok') && Object.prototype.hasOwnProperty.call(body, 'data')) {
        return body.data;
    }
    return body;
};

export const authApi = {
    async register(payload) {
        const response = await httpClient.post('/api/register', payload);
        return unwrapPayload(response);
    },

    async login(payload) {
        const response = await httpClient.post('/api/login', payload);
        return unwrapPayload(response);
    },

    async logout() {
        const response = await httpClient.post('/api/logout', {});
        return unwrapPayload(response);
    },

    async getSession() {
        const response = await httpClient.get('/api/session');
        return unwrapPayload(response);
    }
};
