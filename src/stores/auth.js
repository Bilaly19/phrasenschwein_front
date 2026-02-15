import { computed, ref } from 'vue';

const token = ref(localStorage.getItem('token'));
const username = ref(localStorage.getItem('username'));
const roles = ref(parseStoredRoles(localStorage.getItem('roles')));

function parseStoredRoles(rawRoles) {
    if (!rawRoles) return [];

    try {
        const parsed = JSON.parse(rawRoles);
        return normalizeRoles(parsed);
    } catch {
        return normalizeRoles(rawRoles);
    }
}

function normalizeRoles(input) {
    if (Array.isArray(input)) {
        return [...new Set(input.map((role) => String(role || '').trim()).filter(Boolean))];
    }

    if (typeof input === 'string') {
        const trimmed = input.trim();
        return trimmed ? [trimmed] : [];
    }

    return [];
}

const persistAuth = () => {
    if (token.value) {
        localStorage.setItem('token', token.value);
    } else {
        localStorage.removeItem('token');
    }

    if (username.value) {
        localStorage.setItem('username', username.value);
    } else {
        localStorage.removeItem('username');
    }

    if (roles.value.length) {
        localStorage.setItem('roles', JSON.stringify(roles.value));
    } else {
        localStorage.removeItem('roles');
    }
};

export const useAuth = () => {
    const isAuthenticated = computed(() => Boolean(token.value));
    const hasRole = (role) => roles.value.includes(role);

    const login = (nextToken, nextUsername, nextRoles = []) => {
        token.value = nextToken;
        username.value = nextUsername || null;
        roles.value = normalizeRoles(nextRoles);
        persistAuth();
    };

    const clearAuthState = () => {
        token.value = null;
        username.value = null;
        roles.value = [];
        persistAuth();
    };

    return {
        token,
        username,
        roles,
        isAuthenticated,
        hasRole,
        login,
        logout: clearAuthState,
        reset: clearAuthState,
        clearAuthState
    };
};

export const getAuthToken = () => token.value;

