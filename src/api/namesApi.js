import { httpClient } from './httpClient';

const unwrapPayload = (response) => {
    const body = response?.data;
    if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'ok') && Object.prototype.hasOwnProperty.call(body, 'data')) {
        return body.data;
    }
    return body;
};

export const namesApi = {
    async getNames() {
        const response = await httpClient.get('/api/names');
        return unwrapPayload(response);
    },

    async getConfig() {
        const response = await httpClient.get('/api/config');
        return unwrapPayload(response);
    },

    async updateConfig(valuePerClick) {
        const response = await httpClient.post('/api/config', { valuePerClick });
        return unwrapPayload(response);
    },

    async incrementName(name) {
        const response = await httpClient.post(`/api/increment/${encodeURIComponent(name)}`);
        return unwrapPayload(response);
    },

    async resetNames() {
        const response = await httpClient.post('/api/reset', {});
        return unwrapPayload(response);
    },

    async deleteName(name) {
        const response = await httpClient.delete(`/api/delete/${encodeURIComponent(name)}`);
        return unwrapPayload(response);
    },

    async getDonationLink() {
        const response = await httpClient.get('/api/donation-link');
        return unwrapPayload(response);
    }
};
