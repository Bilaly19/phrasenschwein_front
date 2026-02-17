<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import LoginForm from '@/views/phrasenschwein/components/LoginForm.vue';
import RegisterForm from '@/views/phrasenschwein/components/RegisterForm.vue';
import { authApi, clearAuthorizationToken, getErrorMessage, pigsApi } from '@/api';
import { useAuth } from '@/stores/auth';
import { resolveSessionRoles } from '@/utils/authRoles';

const router = useRouter();
const toast = useToast();

const { token, username, isAuthenticated, login: setAuthState, reset: resetAuth } = useAuth();

const authInitialized = ref(false);
const authMode = ref('login');
const prefilledUsername = ref('');
const errorMessage = ref('');
const infoMessage = ref('');

const pigs = ref([]);
const newTitle = ref('');
const inviteCode = ref('');

const loading = reactive({
    list: false,
    create: false,
    join: false,
    logout: false
});

const disableAutoLogin =
    String(import.meta.env.VITE_DISABLE_AUTOLOGIN || '')
        .trim()
        .toLowerCase() === 'true';

const authDebug = (...args) => {
    if (import.meta.env.DEV) {
        console.debug(...args);
    }
};

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

const pigsCount = computed(() => pigs.value.length);

const fetchPigs = async () => {
    loading.list = true;
    try {
        const payload = await pigsApi.listPigs();
        pigs.value = Array.isArray(payload?.pigs) ? payload.pigs : [];
    } catch (error) {
        errorMessage.value = formatApiError(error, 'Phrasenschweine konnten nicht geladen werden.');
    } finally {
        loading.list = false;
    }
};

const createPig = async () => {
    clearMessages();
    loading.create = true;
    try {
        const payload = await pigsApi.createPig(newTitle.value.trim());
        const pig = payload?.pig;
        if (!pig?.id) {
            throw new Error('Missing pig id in create response.');
        }
        infoMessage.value = 'Phrasenschwein erstellt.';
        newTitle.value = '';
        await router.push({ name: 'pig', params: { pigId: pig.id } });
    } catch (error) {
        errorMessage.value = formatApiError(error, 'Phrasenschwein konnte nicht erstellt werden.');
    } finally {
        loading.create = false;
    }
};

const joinWithCode = async () => {
    clearMessages();
    const code = inviteCode.value.trim();
    if (!code) {
        errorMessage.value = 'Bitte einen Invite-Code einfuegen.';
        return;
    }

    loading.join = true;
    try {
        if (!isAuthenticated.value) {
            await router.push({ name: 'invite-token', params: { token: code } });
            return;
        }

        const result = await pigsApi.acceptInvite(code);
        inviteCode.value = '';
        await router.push({ name: 'pig', params: { pigId: result.pigId } });
    } catch (error) {
        errorMessage.value = formatApiError(error, 'Invite konnte nicht angenommen werden.');
    } finally {
        loading.join = false;
    }
};

const handleLogout = async () => {
    clearMessages();
    loading.logout = true;
    try {
        await authApi.logout();
    } catch (error) {
        errorMessage.value = formatApiError(error, 'Logout konnte nicht vollstaendig abgeschlossen werden.');
    } finally {
        clearAuthorizationToken();
        resetAuth();
        pigs.value = [];
        loading.logout = false;
    }
};

const onLogin = async () => {
    clearMessages();
    authMode.value = 'login';
    await fetchPigs();
    toast.add({ severity: 'success', summary: 'Erfolg', detail: 'Login erfolgreich', life: 2800 });
};

const onRegisterSuccess = async (payload) => {
    clearMessages();
    const nextUsername = String(payload?.username || '').trim();
    const nextToken = String(payload?.token || '').trim();
    const nextRoles = payload?.roles || [];
    toast.add({ severity: 'success', summary: 'Erfolg', detail: 'Registrierung erfolgreich', life: 2800 });

    if (nextToken) {
        setAuthState(nextToken, nextUsername, nextRoles);
        await onLogin();
        return;
    }

    prefilledUsername.value = nextUsername;
    authMode.value = 'login';
};

const onUnauthorized = (event) => {
    clearAuthorizationToken();
    resetAuth();
    pigs.value = [];
    authMode.value = 'login';
    infoMessage.value = event.detail || 'Bitte erneut einloggen.';
};

const initializeAuth = async () => {
    const storedToken = token.value;
    const initToken = storedToken;
    authDebug('[auth] token loaded from storage:', storedToken ? 'present' : 'missing');

    if (disableAutoLogin) {
        clearAuthorizationToken();
        resetAuth();
        pigs.value = [];
        authInitialized.value = true;
        return;
    }

    if (!storedToken) {
        clearAuthorizationToken();
        resetAuth();
        pigs.value = [];
        authInitialized.value = true;
        return;
    }

    try {
        const session = await authApi.getSession();
        if (token.value !== initToken) {
            return;
        }
        const resolvedUsername = session?.username || username.value;
        const resolvedRoles = resolveSessionRoles(session);
        setAuthState(storedToken, resolvedUsername, resolvedRoles);
        await fetchPigs();
    } catch (error) {
        clearAuthorizationToken();
        resetAuth();
        pigs.value = [];
    } finally {
        authInitialized.value = true;
    }
};

onMounted(() => {
    window.addEventListener('auth:unauthorized', onUnauthorized);
    void initializeAuth();
});

onBeforeUnmount(() => {
    window.removeEventListener('auth:unauthorized', onUnauthorized);
});

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
    <div class="p-2">
        <div v-if="authInitialized && isAuthenticated" class="mx-auto w-full max-w-6xl text-sm">
            <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0">
                    <h1 class="text-xl font-semibold leading-tight">Meine Phrasenschweine</h1>
                    <p class="mt-1 text-sm text-color-secondary">Erstelle ein neues oder tritt per Invite bei.</p>
                </div>
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Tag :value="`Eingeloggt als @${username}`" severity="info" class="text-xs w-fit" />
                    <Button icon="pi pi-sign-out" label="Logout" severity="secondary" size="small" class="p-button-sm w-full sm:w-auto" :disabled="loading.logout" @click="handleLogout" />
                </div>
            </div>

            <Message v-if="errorMessage" severity="error" class="mb-3">{{ errorMessage }}</Message>
            <Message v-if="infoMessage" severity="success" class="mb-3">{{ infoMessage }}</Message>

            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Panel header="Neu erstellen">
                    <div class="p-fluid">
                        <label class="text-xs text-color-secondary">Titel (optional)</label>
                        <InputText v-model="newTitle" placeholder="z.B. WG-Kueche" class="w-full" :disabled="loading.create" />
                        <Button class="mt-2 w-full" size="small" label="Erstellen" icon="pi pi-plus" :disabled="loading.create" @click="createPig" />
                    </div>
                </Panel>

                <Panel header="Mit Invite beitreten">
                    <div class="p-fluid">
                        <label class="text-xs text-color-secondary">Code oder Link-Token</label>
                        <InputText v-model="inviteCode" placeholder="Invite-Code einfuegen" class="w-full" :disabled="loading.join" />
                        <Button class="mt-2 w-full" size="small" label="Beitreten" icon="pi pi-ticket" :disabled="loading.join" @click="joinWithCode" />
                    </div>
                </Panel>
            </div>

            <Panel class="mt-3" :header="`Deine Phrasenschweine (${pigsCount})`">
                <div v-if="loading.list" class="text-color-secondary">Laedt...</div>
                <div v-else-if="!pigsCount" class="text-color-secondary">Noch keine. Erstelle eins oder tritt bei.</div>
                <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Card v-for="pig in pigs" :key="pig.id">
                        <template #title>
                            <div class="flex items-center justify-between gap-2">
                                <span class="truncate">{{ pig.title || 'Phrasenschwein' }}</span>
                                <Tag :value="pig.role === 'admin' ? 'Admin' : 'Mitglied'" :severity="pig.role === 'admin' ? 'success' : 'secondary'" class="text-xs" />
                            </div>
                        </template>
                        <template #content>
                            <p class="text-sm text-color-secondary mb-2">Wert pro Klick: {{ pig.valuePerClick }}</p>
                            <Button size="small" class="w-full p-button-sm" icon="pi pi-arrow-right" label="Oeffnen" @click="router.push({ name: 'pig', params: { pigId: pig.id } })" />
                        </template>
                    </Card>
                </div>
            </Panel>
        </div>

        <div v-else-if="authInitialized && !isAuthenticated" class="mx-auto max-w-xl">
            <RegisterForm v-if="authMode === 'register'" @switch="authMode = 'login'" @register-success="onRegisterSuccess" />
            <LoginForm v-else :prefill-username="prefilledUsername" @switch-register="authMode = 'register'" @login-success="onLogin" />
        </div>

        <div v-else class="text-center text-color-secondary">Initialisiere...</div>
    </div>
</template>
