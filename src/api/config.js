const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const readEnvUrl = (value) => {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    return trimmed ? trimTrailingSlash(trimmed) : '';
};

export const resolveApiBaseUrl = () => {
    const proxyTarget = readEnvUrl(import.meta.env.VITE_API_PROXY_TARGET);
    if (proxyTarget) return '';

    return readEnvUrl(import.meta.env.VITE_API_URL);
};
