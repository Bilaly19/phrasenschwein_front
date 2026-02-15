<script setup>
import { ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { authApi, clearAuthorizationToken, getErrorMessage, namesApi } from '@/api';
import { useAuth } from '@/stores/auth';
import { resolveSessionRoles } from '@/utils/authRoles';

const props = defineProps({
    prefillUsername: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['login-success', 'switch-register']);
const localUsername = ref('');
const password = ref('');
const error = ref('');
const isSubmitting = ref(false);
const { login: loginAuth, reset: resetAuth } = useAuth();
const toast = useToast();
const authDebug = (...args) => {
    if (import.meta.env.DEV) {
        console.debug(...args);
    }
};

const asObject = (value) => (value && typeof value === 'object' ? value : {});
const getPendingNameEntryKey = (value) =>
    `ps:pending-name-entry:${String(value || '')
        .trim()
        .toLowerCase()}`;
const extractToken = (payload) => {
    const source = asObject(payload);
    return String(source.token || source.accessToken || source.jwt || '').trim();
};

watch(
    () => props.prefillUsername,
    (value) => {
        localUsername.value = String(value || '').trim();
    },
    { immediate: true }
);

const login = async () => {
    error.value = '';

    if (!localUsername.value.trim() || !password.value.trim()) {
        error.value = 'Bitte Benutzername und Passwort eingeben.';
        return;
    }

    isSubmitting.value = true;
    try {
        const normalizedUsername = localUsername.value.trim();
        const res = await authApi.login({
            username: normalizedUsername,
            password: password.value
        });
        const responseObject = asObject(res);
        const nestedPayload = asObject(responseObject.data);
        const loginPayload = Object.keys(nestedPayload).length ? nestedPayload : responseObject;
        const loginToken = extractToken(loginPayload) || extractToken(responseObject);

        if (!loginToken) {
            authDebug('[auth] login response keys:', Object.keys(responseObject));
            throw new Error('Missing auth token in login response.');
        }

        let resolvedUsername = loginPayload.username || responseObject.username || normalizedUsername;
        let resolvedRoles = ['user'];
        loginAuth(loginToken, resolvedUsername, resolvedRoles);
        authDebug('[auth] token stored after login:', window.localStorage.getItem('token') ? 'present' : 'missing');

        try {
            const session = await authApi.getSession();
            authDebug('[auth] /api/session status:', 200);
            if (session?.username) {
                resolvedUsername = session.username;
            }
            resolvedRoles = resolveSessionRoles(session);
            loginAuth(loginToken, resolvedUsername, resolvedRoles);
        } catch (sessionError) {
            authDebug('[auth] /api/session status:', sessionError?.status ?? 'n/a');
            authDebug('[auth] login session sync failed:', sessionError?.status ?? sessionError);
        }

        const pendingNameEntryKey = getPendingNameEntryKey(resolvedUsername);
        const shouldEnsureNameEntry = window.localStorage.getItem(pendingNameEntryKey) === '1';
        if (shouldEnsureNameEntry) {
            try {
                await namesApi.incrementName(resolvedUsername);
                window.localStorage.removeItem(pendingNameEntryKey);
                authDebug('[auth] ensured name entry after registration:', resolvedUsername);
            } catch (nameEntryError) {
                authDebug('[auth] failed to ensure name entry after registration:', resolvedUsername, nameEntryError?.status ?? nameEntryError);
            }
        }

        emit('login-success');
    } catch (e) {
        clearAuthorizationToken();
        resetAuth();
        authDebug('[auth] login error status/code:', e?.status ?? 'n/a', e?.code ?? 'n/a');
        if (e?.status === 401 && e?.code === 'LOGIN_FAILED') {
            error.value = 'Benutzername oder Passwort ist falsch.';
        } else {
            const baseMessage = getErrorMessage(e, 'Login fehlgeschlagen.');
            error.value = e?.code ? `[${e.code}] ${baseMessage}` : baseMessage;
        }
        toast.add({ severity: 'error', summary: 'Login', detail: error.value, life: 3500 });
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <Card class="auth-card">
        <template #title>
            <p class="text-xs uppercase tracking-[0.2em] text-primary">Willkommen</p>
            <h2 class="mt-1 text-lg font-semibold mb-3">Login</h2>
        </template>
        <template #subtitle>
            <p class="text-sm opacity-80 mb-3">Melde dich an und fuettere das Phrasenschwein.</p>
        </template>
        <template #content>
            <div class="p-fluid text-sm flex flex-col gap-2">
                <IconField>
                    <InputIcon class="pi pi-user" />
                    <InputText v-model="localUsername" placeholder="Benutzername" :disabled="isSubmitting" class="w-full p-inputtext-sm" @keyup.enter="login" />
                </IconField>
                <IconField>
                    <InputIcon class="pi pi-lock" />
                    <Password v-model="password" placeholder="Passwort" :disabled="isSubmitting" :feedback="false" toggleMask inputClass="w-full p-inputtext-sm" class="w-full" @keyup.enter="login" />
                </IconField>
            </div>
            <Button @click="login" :disabled="isSubmitting" :label="isSubmitting ? 'Bitte warten...' : 'Einloggen'" icon="pi pi-sign-in" size="small" class="mt-3 w-full p-button-sm" />
            <Message v-if="error" severity="error" class="mt-3">{{ error }}</Message>
            <div class="mt-3 text-sm text-color-secondary">
                Noch kein Konto?
                <Button label="Registrieren" link size="small" class="p-0 ml-1 align-baseline" @click="$emit('switch-register')" />
            </div>
        </template>
    </Card>
</template>
