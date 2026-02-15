import { httpClient } from './httpClient';

export const namesApi = {
    async getNames() {
        const response = await httpClient.get('/api/names');
        return response.data;
    },

    async getConfig() {
        const response = await httpClient.get('/api/config');
        return response.data;
    },

    async updateConfig(valuePerClick) {
        const response = await httpClient.post('/api/config', { valuePerClick });
        return response.data;
    },

    async addName(name) {
        const response = await httpClient.post('/api/add', { name });
        return response.data;
    },

    async incrementName(name) {
        const response = await httpClient.post(`/api/increment/${encodeURIComponent(name)}`);
        return response.data;
    },

    async resetNames() {
        const response = await httpClient.post('/api/reset', {});
        return response.data;
    },

    async deleteName(name) {
        const response = await httpClient.delete(`/api/delete/${encodeURIComponent(name)}`);
        return response.data;
    },

    async getDonationLink() {
        const response = await httpClient.get('/api/donation-link');
        return response.data;
    }
};
