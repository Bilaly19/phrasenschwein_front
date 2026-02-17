import { computed, ref } from 'vue';
import { normalizeRoles } from '@/utils/authRoles';
import { hasAnyRequiredRole } from '@/utils/accessControl';

const TOKEN_STORAGE_KEY = 'token';
const USERNAME_STORAGE_KEY = 'username';
const ROLES_STORAGE_KEY = 'roles';

const readStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

const token = ref(readStoredToken());
const username = ref(localStorage.getItem(USERNAME_STORAGE_KEY));
const roles = ref(parseStoredRoles(localStorage.getItem(ROLES_STORAGE_KEY)));

function parseStoredRoles(rawRoles) {
    if (!rawRoles) return [];

    try {
        const parsed = JSON.parse(rawRoles);
        return normalizeRoles(parsed, { ensureUser: true });
    } catch {
        return normalizeRoles(rawRoles, { ensureUser: true });
    }
}

const persistAuth = () => {
    if (token.value) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token.value);
    } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
    }

    if (username.value) {
        localStorage.setItem(USERNAME_STORAGE_KEY, username.value);
    } else {
        localStorage.removeItem(USERNAME_STORAGE_KEY);
    }

    if (roles.value.length) {
        localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles.value));
    } else {
        localStorage.removeItem(ROLES_STORAGE_KEY);
    }
};

export const useAuth = () => {
    const isAuthenticated = computed(() => Boolean(token.value));
    const hasRole = (requiredRoles) => hasAnyRequiredRole(roles.value, requiredRoles);

    const login = (nextToken, nextUsername, nextRoles = []) => {
        token.value = nextToken;
        username.value = nextUsername || null;
        roles.value = normalizeRoles(nextRoles, { ensureUser: true });
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

export const getAuthToken = () => token.value || readStoredToken();
