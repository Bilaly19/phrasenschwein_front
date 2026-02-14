import { httpClient } from './httpClient';

export const authApi = {
  async register(payload) {
    const response = await httpClient.post('/api/register', payload);
    return response.data;
  },

  async login(payload) {
    const response = await httpClient.post('/api/login', payload);
    return response.data;
  },

  async logout() {
    const response = await httpClient.post('/api/logout', {});
    return response.data;
  },

  async getSession() {
    const response = await httpClient.get('/api/session');
    return response.data;
  }
};
