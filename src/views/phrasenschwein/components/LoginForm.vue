<script setup>
import { ref } from 'vue';
import { authApi, clearAuthorizationToken, getErrorMessage } from '@/api';
import { useAuth } from '@/stores/auth';

const emit = defineEmits(['login-success', 'switch']);
const localUsername = ref('');
const password = ref('');
const error = ref('');
const isSubmitting = ref(false);
const { login: loginAuth, reset: resetAuth } = useAuth();
const authDebug = (...args) => {
    if (import.meta.env.DEV) {
        console.debug(...args);
    }
};

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

        let resolvedUsername = res.username || normalizedUsername;

        try {
            const session = await authApi.getSession();
            if (session?.username) {
                resolvedUsername = session.username;
            }
        } catch (sessionError) {
            authDebug('[auth] login session sync failed:', sessionError?.status ?? sessionError);
        }

        loginAuth(res.token, resolvedUsername);
        emit('login-success');
    } catch (e) {
        clearAuthorizationToken();
        resetAuth();
        authDebug('[auth] login error status/code:', e?.status ?? 'n/a', e?.code ?? 'n/a');
        if (e?.status === 401 && e?.code === 'LOGIN_FAILED') {
            error.value = 'Benutzername oder Passwort ist falsch.';
        } else {
            error.value = getErrorMessage(e, 'Login fehlgeschlagen.');
        }
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
                <Button label="Registrieren" link size="small" class="p-0 ml-1 align-baseline" @click="$emit('switch')" />
            </div>
        </template>
    </Card>
</template>

