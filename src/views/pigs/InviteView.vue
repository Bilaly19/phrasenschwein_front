<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import LoginForm from '@/views/phrasenschwein/components/LoginForm.vue';
import RegisterForm from '@/views/phrasenschwein/components/RegisterForm.vue';
import { authApi, clearAuthorizationToken, getErrorMessage, pigsApi } from '@/api';
import { useAuth } from '@/stores/auth';
import { resolveSessionRoles } from '@/utils/authRoles';

const INVITE_STORAGE_KEY = 'pendingInviteToken';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const { token, username, isAuthenticated, login: setAuthState, reset: resetAuth } = useAuth();

const authInitialized = ref(false);
const authMode = ref('register');
const prefilledUsername = ref('');
const inviteToken = ref('');
const errorMessage = ref('');
const infoMessage = ref('');
const isAccepting = ref(false);

const tokenFromRoute = computed(() => String(route.params?.token || '').trim());

const clearMessages = () => {
    errorMessage.value = '';
    infoMessage.value = '';
};

const formatApiError = (error, fallback) => {
    const baseMessage = getErrorMessage(error, fallback);
    if (error?.code) {
        return `[${error.code}] ${baseMessage}`;
    }
    return baseMessage;
};

const readStoredInviteToken = () => {
    try {
        return String(sessionStorage.getItem(INVITE_STORAGE_KEY) || '').trim();
    } catch {
        return '';
    }
};

const writeStoredInviteToken = (value) => {
    try {
        if (value) {
            sessionStorage.setItem(INVITE_STORAGE_KEY, value);
        } else {
            sessionStorage.removeItem(INVITE_STORAGE_KEY);
        }
    } catch {
        // ignore
    }
};

const acceptInvite = async () => {
    clearMessages();

    const code = inviteToken.value.trim();
    if (!code) {
        errorMessage.value = 'Invite-Code fehlt.';
        return;
    }

    if (!isAuthenticated.value) {
        errorMessage.value = 'Bitte zuerst einloggen oder registrieren.';
        return;
    }

    isAccepting.value = true;
    try {
        const result = await pigsApi.acceptInvite(code);
        writeStoredInviteToken('');
        inviteToken.value = '';
        infoMessage.value = 'Invite angenommen.';
        await router.replace({ name: 'pig', params: { pigId: result.pigId } });
    } catch (error) {
        errorMessage.value = formatApiError(error, 'Invite konnte nicht angenommen werden.');
    } finally {
        isAccepting.value = false;
    }
};

const onRegisterSuccess = async (payload) => {
    clearMessages();
    const nextUsername = String(payload?.username || '').trim();
    const nextToken = String(payload?.token || '').trim();
    const nextRoles = payload?.roles || [];

    toast.add({ severity: 'success', summary: 'Erfolg', detail: 'Registrierung erfolgreich', life: 2800 });

    if (nextToken) {
        setAuthState(nextToken, nextUsername, nextRoles);

        try {
            const session = await authApi.getSession();
            const resolvedUsername = session?.username || nextUsername;
            const resolvedRoles = resolveSessionRoles(session);
            setAuthState(nextToken, resolvedUsername, resolvedRoles);
        } catch {
            // ignore
        }

        await acceptInvite();
        return;
    }

    prefilledUsername.value = nextUsername;
    authMode.value = 'login';
    infoMessage.value = 'Bitte kurz einloggen, um dem Phrasenschwein beizutreten.';
};

const onUnauthorized = (event) => {
    clearAuthorizationToken();
    resetAuth();
    authMode.value = 'login';
    infoMessage.value = event.detail || 'Bitte erneut einloggen.';
};

const initializeAuth = async () => {
    const storedToken = token.value;

    if (!storedToken) {
        clearAuthorizationToken();
        resetAuth();
        authInitialized.value = true;
        return;
    }

    try {
        const session = await authApi.getSession();
        const resolvedUsername = session?.username || username.value;
        const resolvedRoles = resolveSessionRoles(session);
        setAuthState(storedToken, resolvedUsername, resolvedRoles);
    } catch {
        clearAuthorizationToken();
        resetAuth();
    } finally {
        authInitialized.value = true;
    }
};

onMounted(() => {
    window.addEventListener('auth:unauthorized', onUnauthorized);

    const fromRoute = tokenFromRoute.value;
    if (fromRoute) {
        writeStoredInviteToken(fromRoute);
        inviteToken.value = fromRoute;
        // remove token from URL
        void router.replace({ name: 'invite' });
    } else {
        inviteToken.value = readStoredInviteToken();
    }

    void initializeAuth();
});

onBeforeUnmount(() => {
    window.removeEventListener('auth:unauthorized', onUnauthorized);
});

watch(
    () => isAuthenticated.value,
    (authed) => {
        if (authed && inviteToken.value) {
            void acceptInvite();
        }
    }
);

watch(errorMessage, (message) => {
    if (!message) return;
    toast.add({ severity: 'error', summary: 'Fehler', detail: message, life: 3500 });
});

watch(infoMessage, (message) => {
    if (!message) return;
    toast.add({ severity: 'success', summary: 'Info', detail: message, life: 2800 });
});
</script>

<template>
    <div class="apple-scene apple-invite p-4 flex justify-center">
        <div class="w-full max-w-2xl">
            <section class="apple-hero apple-reveal mb-3">
                <div class="min-w-0">
                    <p class="apple-hero__eyebrow">Invite</p>
                    <h1 class="apple-hero__title">Phrasenschwein beitreten</h1>
                    <p class="apple-hero__subtitle">Registriere dich oder logge dich ein. Danach wird der Invite automatisch angenommen.</p>
                </div>
                <div class="apple-quick-stats">
                    <span class="apple-stat-pill">Sicherer Einladungslink</span>
                    <span class="apple-stat-pill">Direkter Board-Zugang</span>
                </div>
            </section>

            <Card class="apple-invite-card apple-reveal apple-reveal-delay-1">
                <template #title>
                    <div class="min-w-0">
                        <p class="apple-auth-kicker text-xs uppercase tracking-[0.2em] text-primary">Invite</p>
                        <h1 class="apple-auth-title mt-1 text-xl font-semibold leading-tight">Code bestaetigen</h1>
                    </div>
                </template>
                <template #subtitle>
                    <p class="apple-auth-subtitle text-sm text-color-secondary">Du kannst den Code direkt verwenden oder den Link aus der Einladung oeffnen.</p>
                </template>
                <template #content>
                    <div class="p-fluid mb-3">
                        <label class="text-xs text-color-secondary">Invite-Code</label>
                        <InputText v-model="inviteToken" placeholder="Code einfuegen" :disabled="isAccepting" class="w-full" />
                        <Button
                            v-if="authInitialized && isAuthenticated"
                            class="mt-2 w-full"
                            size="small"
                            label="Invite annehmen"
                            icon="pi pi-check"
                            :disabled="isAccepting || !inviteToken"
                            @click="acceptInvite"
                        />
                    </div>

                    <Message v-if="errorMessage" severity="error" class="mb-3">{{ errorMessage }}</Message>
                    <Message v-if="infoMessage" severity="success" class="mb-3">{{ infoMessage }}</Message>

                    <div v-if="authInitialized && !isAuthenticated">
                        <RegisterForm v-if="authMode === 'register'" @switch="authMode = 'login'" @register-success="onRegisterSuccess" />
                        <LoginForm v-else :prefill-username="prefilledUsername" @switch-register="authMode = 'register'" @login-success="acceptInvite" />
                    </div>

                    <div v-else-if="authInitialized && isAuthenticated" class="text-sm text-color-secondary">
                        Eingeloggt als <span class="font-semibold">@{{ username }}</span>. Invite wird angenommen...
                    </div>
                </template>
            </Card>
        </div>
    </div>
</template>
