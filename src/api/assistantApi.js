import { httpClient } from './httpClient';

const unwrapPayload = (response) => {
    const body = response?.data;
    if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'ok') && Object.prototype.hasOwnProperty.call(body, 'data')) {
        return body.data;
    }
    return body;
};

export const assistantApi = {
    async chat({ message, history = [], includePortfolio = true } = {}) {
        const response = await httpClient.post('/api/assistant/chat', {
            message,
            history,
            includePortfolio
        });
        return unwrapPayload(response);
    }
};
