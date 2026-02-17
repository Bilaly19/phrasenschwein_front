import { httpClient } from './httpClient';

const unwrapPayload = (response) => {
    const body = response?.data;
    if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'ok') && Object.prototype.hasOwnProperty.call(body, 'data')) {
        return body.data;
    }
    return body;
};

export const pigsApi = {
    async listPigs() {
        const response = await httpClient.get('/api/pigs');
        return unwrapPayload(response);
    },

    async createPig(title = '') {
        const response = await httpClient.post('/api/pigs', { title });
        return unwrapPayload(response);
    },

    async createInvite(pigId, { maxUses = 1, ttlHours = 24 * 7 } = {}) {
        const response = await httpClient.post(`/api/pigs/${encodeURIComponent(pigId)}/invites`, { maxUses, ttlHours });
        return unwrapPayload(response);
    },

    async acceptInvite(token) {
        const response = await httpClient.post('/api/invites/accept', { token });
        return unwrapPayload(response);
    },

    async getNames(pigId) {
        const response = await httpClient.get(`/api/pigs/${encodeURIComponent(pigId)}/names`);
        return unwrapPayload(response);
    },

    async getConfig(pigId) {
        const response = await httpClient.get(`/api/pigs/${encodeURIComponent(pigId)}/config`);
        return unwrapPayload(response);
    },

    async updateConfig(pigId, { valuePerClick, paypalLink } = {}) {
        const response = await httpClient.post(`/api/pigs/${encodeURIComponent(pigId)}/config`, { valuePerClick, paypalLink });
        return unwrapPayload(response);
    },

    async incrementMine(pigId, username) {
        const response = await httpClient.post(`/api/pigs/${encodeURIComponent(pigId)}/increment/${encodeURIComponent(username)}`);
        return unwrapPayload(response);
    },

    async resetMine(pigId) {
        const response = await httpClient.post(`/api/pigs/${encodeURIComponent(pigId)}/reset`, {});
        return unwrapPayload(response);
    }
};

