<script setup>
import { onMounted } from 'vue';
import { authApi, clearAuthorizationToken } from '@/api';
import { useAuth } from '@/stores/auth';
import { resolveSessionRoles } from '@/utils/authRoles';

const { token, username, login: setAuthState, reset: resetAuth } = useAuth();
const disableAutoLogin =
    String(import.meta.env.VITE_DISABLE_AUTOLOGIN || '')
        .trim()
        .toLowerCase() === 'true';

const authDebug = (...args) => {
    if (import.meta.env.DEV) {
        console.debug(...args);
    }
};

const initializeAuth = async () => {
    const storedToken = token.value;

    if (disableAutoLogin) {
        clearAuthorizationToken();
        resetAuth();
        return;
    }

    if (!storedToken) {
        clearAuthorizationToken();
        resetAuth();
        return;
    }

    try {
        const session = await authApi.getSession();
        authDebug('[auth] /api/session status:', 200);
        const resolvedUsername = session?.username || username.value;
        const resolvedRoles = resolveSessionRoles(session);
        setAuthState(storedToken, resolvedUsername, resolvedRoles);
    } catch (error) {
        authDebug('[auth] /api/session status:', error?.status ?? 'n/a');
        if (error?.status === 401) {
            clearAuthorizationToken();
            resetAuth();
        }
    }
};

onMounted(() => {
    void initializeAuth();
});
</script>

<template>
    <router-view />
</template>

<style scoped></style>
