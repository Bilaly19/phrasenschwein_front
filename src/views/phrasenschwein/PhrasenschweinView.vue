<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import AppShell from './components/AppShell.vue';
import NameEntry from './components/NameEntry.vue';
import ClickValueInput from './components/ClickValueInput.vue';
import LoginForm from './components/LoginForm.vue';
import RegisterForm from './components/RegisterForm.vue';
import { authApi, clearAuthorizationToken, getErrorMessage, namesApi } from '@/api';
import { useAuth } from '@/stores/auth';
import { resolveSessionRoles } from '@/utils/authRoles';

const { token, username, isAuthenticated, login: setAuthState, reset: resetAuth } = useAuth();
const toast = useToast();
const confirm = useConfirm();

const names = ref({});
const valuePerClick = ref(0.5);
const authInitialized = ref(false);
const authMode = ref('login');
const prefilledUsername = ref('');
const paypalUrl = ref((import.meta.env.VITE_PAYPAL_URL || '').trim());
const errorMessage = ref('');
const infoMessage = ref('');
const isInitializingConfig = ref(false);
const pendingNames = ref(new Set());

const loading = reactive({
    fetchNames: false,
    saveConfig: false,
    reset: false,
    logout: false
});

let saveTimer = null;
const disableAutoLogin =
    String(import.meta.env.VITE_DISABLE_AUTOLOGIN || '')
        .trim()
        .toLowerCase() === 'true';
const authDebug = (...args) => {
    if (import.meta.env.DEV) {
        console.debug(...args);
    }
};

const safeValuePerClick = computed(() => (Number.isFinite(valuePerClick.value) ? valuePerClick.value : 0));
const ownEntryExists = computed(() => Boolean(username.value && Object.prototype.hasOwnProperty.call(names.value, username.value)));

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

const isNamePending = (name) => pendingNames.value.has(name);

const nameEntries = computed(() =>
    Object.entries(names.value).map(([name, data]) => ({
        name,
        data
    }))
);
const namesCount = computed(() => nameEntries.value.length);
const totalClicks = computed(() => nameEntries.value.reduce((sum, entry) => sum + (Number(entry.data?.clicks ?? entry.data?.count) || 0), 0));
const totalAmount = computed(() => (totalClicks.value * safeValuePerClick.value).toFixed(2));
const hasNames = computed(() => namesCount.value > 0);
const isOwnEntry = (entryName) => entryName === username.value;

const setNamePending = (name, active) => {
    const next = new Set(pendingNames.value);
    if (active) {
        next.add(name);
    } else {
        next.delete(name);
    }
    pendingNames.value = next;
};

const normalizeNamesPayload = (payload) => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

    if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
        return payload.data;
    }

    return payload;
};

const fetchNames = async () => {
    loading.fetchNames = true;
    try {
        const payload = await namesApi.getNames();
        const normalized = normalizeNamesPayload(payload);
        if (!normalized) {
            throw new Error('Ungueltiges Namen-Format von der API.');
        }
        names.value = normalized;
    } catch (error) {
        errorMessage.value = formatApiError(error, 'Namen konnten nicht geladen werden.');
    } finally {
        loading.fetchNames = false;
    }
};

const loadConfig = async () => {
    loading.saveConfig = true;
    isInitializingConfig.value = true;
    try {
        const config = await namesApi.getConfig();
        const nextValue = Number.parseFloat(config?.valuePerClick);
        valuePerClick.value = Number.isFinite(nextValue) ? nextValue : 0.5;
    } catch (error) {
        errorMessage.value = formatApiError(error, 'Konfiguration konnte nicht geladen werden.');
    } finally {
        loading.saveConfig = false;
        isInitializingConfig.value = false;
    }
};

const saveConfig = async (val) => {
    if (!Number.isFinite(val)) return;

    loading.saveConfig = true;
    try {
        await namesApi.updateConfig(val);
    } catch (error) {
        errorMessage.value = formatApiError(error, 'Konfiguration konnte nicht gespeichert werden.');
    } finally {
        loading.saveConfig = false;
    }
};

const increment = async (name) => {
    clearMessages();
    setNamePending(name, true);
    try {
        await namesApi.incrementName(name);
        await fetchNames();
        infoMessage.value = `${name} wurde erhoeht.`;
    } catch (error) {
        errorMessage.value = formatApiError(error, 'Zaehler konnte nicht erhoeht werden.');
    } finally {
        setNamePending(name, false);
    }
};

const deleteName = async (name) => {
    clearMessages();
    setNamePending(name, true);
    try {
        await namesApi.deleteName(name);
        await fetchNames();
        infoMessage.value = `"${name}" wurde geloescht.`;
    } catch (error) {
        errorMessage.value = formatApiError(error, 'Name konnte nicht geloescht werden.');
    } finally {
        setNamePending(name, false);
    }
};

const resetMine = async () => {
    clearMessages();
    loading.reset = true;
    try {
        await namesApi.resetNames();
        await fetchNames();
        infoMessage.value = 'Mein Zaehler wurde zurueckgesetzt.';
    } catch (error) {
        errorMessage.value = formatApiError(error, 'Zaehler konnte nicht zurueckgesetzt werden.');
    } finally {
        loading.reset = false;
    }
};

const requestDeleteName = (name) => {
    confirm.require({
        message: `"${name}" wirklich loeschen?`,
        header: 'Name loeschen',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: {
            label: 'Abbrechen',
            severity: 'secondary',
            outlined: true,
            size: 'small'
        },
        acceptProps: {
            label: 'Loeschen',
            severity: 'danger',
            size: 'small'
        },
        accept: () => {
            void deleteName(name);
        }
    });
};

const requestResetMine = () => {
    confirm.require({
        message: 'Wirklich deinen Zaehler zuruecksetzen?',
        header: 'Mein Zaehler',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: {
            label: 'Abbrechen',
            severity: 'secondary',
            outlined: true,
            size: 'small'
        },
        acceptProps: {
            label: 'Zuruecksetzen',
            severity: 'danger',
            size: 'small'
        },
        accept: () => {
            void resetMine();
        }
    });
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
        names.value = {};
        authDebug('[auth] logout state reset');
        loading.logout = false;
    }
};

const onLogin = async () => {
    clearMessages();
    authMode.value = 'login';
    await Promise.all([fetchNames(), loadConfig()]);
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
    names.value = {};
    authMode.value = 'login';
    infoMessage.value = event.detail || 'Bitte erneut einloggen.';
};

const initializeAuth = async () => {
    const storedToken = token.value;
    const initToken = storedToken;
    authDebug('[auth] token loaded from storage:', storedToken ? 'present' : 'missing');

    if (disableAutoLogin) {
        authDebug('[auth] auto-login disabled via VITE_DISABLE_AUTOLOGIN');
        clearAuthorizationToken();
        resetAuth();
        names.value = {};
        authInitialized.value = true;
        return;
    }

    if (!storedToken) {
        clearAuthorizationToken();
        resetAuth();
        names.value = {};
        authInitialized.value = true;
        return;
    }

    try {
        const session = await authApi.getSession();
        authDebug('[auth] /api/session status:', 200);
        if (token.value !== initToken) {
            authDebug('[auth] initializeAuth ignored (token changed during request)');
            return;
        }
        const resolvedUsername = session?.username || username.value;
        const resolvedRoles = resolveSessionRoles(session);
        setAuthState(storedToken, resolvedUsername, resolvedRoles);
        authDebug('[auth] session validation result: valid');
        await Promise.all([fetchNames(), loadConfig()]);
    } catch (error) {
        authDebug('[auth] /api/session status:', error?.status ?? 'n/a');
        if (token.value !== initToken) {
            authDebug('[auth] initializeAuth error ignored (token changed during request)');
            return;
        }
        clearAuthorizationToken();
        resetAuth();
        names.value = {};
        authDebug('[auth] session validation result: invalid', error?.status ?? error);
    } finally {
        authInitialized.value = true;
    }
};

const loadPaypalUrl = async () => {
    if (paypalUrl.value) return;

    try {
        const donation = await namesApi.getDonationLink();
        const url = donation?.url || '';
        paypalUrl.value = typeof url === 'string' ? url.trim() : '';
    } catch {
        paypalUrl.value = '';
    }
};

onMounted(() => {
    window.addEventListener('auth:unauthorized', onUnauthorized);
    void initializeAuth();
    void loadPaypalUrl();
});

onBeforeUnmount(() => {
    window.removeEventListener('auth:unauthorized', onUnauthorized);
    if (saveTimer) window.clearTimeout(saveTimer);
});

watch(valuePerClick, (nextVal) => {
    if (isInitializingConfig.value) return;

    if (saveTimer) {
        window.clearTimeout(saveTimer);
    }

    saveTimer = window.setTimeout(() => {
        if (!Number.isFinite(nextVal)) {
            errorMessage.value = 'Bitte einen gueltigen Zahlenwert fuer "Wert pro Klick" eingeben.';
            return;
        }

        saveConfig(nextVal);
    }, 500);
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
        <ConfirmDialog />

        <div v-if="authInitialized && isAuthenticated" class="mx-auto w-full max-w-6xl text-sm">
            <AppShell>
                <template #title>
                    <div class="min-w-0">
                        <h1 class="text-xl font-semibold leading-tight">Phrasenschwein</h1>
                        <p class="mt-1 text-sm text-color-secondary">Verwalte Klicks und den Wert pro Klick.</p>
                    </div>
                </template>
                <template #actions>
                    <Tag :value="`Eingeloggt als @${username}`" severity="info" class="text-xs w-fit" />
                    <Button
                        v-if="paypalUrl"
                        as="a"
                        :href="paypalUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        icon="pi pi-heart"
                        label="Spenden"
                        severity="secondary"
                        size="small"
                        class="p-button-sm w-full sm:w-auto"
                        title="Unterstuetze das Phrasenschwein"
                    />
                    <Button icon="pi pi-sign-out" label="Logout" severity="secondary" size="small" class="p-button-sm w-full sm:w-auto" :disabled="loading.logout" @click="handleLogout" />
                </template>

                <div class="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Panel header="Namen">
                        <p class="text-lg font-semibold">{{ namesCount }}</p>
                    </Panel>
                    <Panel header="Klicks gesamt">
                        <p class="text-lg font-semibold">{{ totalClicks }}</p>
                    </Panel>
                    <Panel header="Wert gesamt">
                        <p class="text-lg font-semibold">{{ totalAmount }} EUR</p>
                    </Panel>
                </div>

                <Panel header="Konfiguration" class="mb-3">
                    <div class="p-fluid">
                        <ClickValueInput v-model="valuePerClick" :disabled="loading.saveConfig" />
                    </div>
                </Panel>

                <Panel header="Namensliste">
                    <p class="mb-3 text-sm text-color-secondary">Alle Usernamen mit Klickstand.</p>
                    <Button @click="requestResetMine" :disabled="loading.reset || loading.fetchNames || !ownEntryExists" icon="pi pi-refresh" label="Mein Zaehler zuruecksetzen" severity="secondary" size="small" class="mb-3 p-button-sm" />
                    <div v-if="hasNames" class="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <NameEntry
                            v-for="entry in nameEntries"
                            :key="entry.name"
                            :name="entry.name"
                            :data="entry.data"
                            :valuePerClick="safeValuePerClick"
                            :canIncrement="isOwnEntry(entry.name)"
                            :canDelete="isOwnEntry(entry.name)"
                            :disabledIncrement="isNamePending(entry.name) || !isOwnEntry(entry.name)"
                            :disabledDelete="isNamePending(entry.name) || !isOwnEntry(entry.name)"
                            @increment="increment"
                            @delete="requestDeleteName"
                        />
                    </div>
                    <div v-else class="flex flex-col items-center justify-center rounded-border border border-dashed border-surface-300 px-4 py-6 text-center">
                        <i class="pi pi-users mb-2 text-3xl text-color-secondary"></i>
                        <p class="font-medium">Noch keine Namen vorhanden</p>
                        <p class="mt-1 text-sm text-color-secondary">Es wurde noch kein Name erfasst.</p>
                        <div class="mt-3">
                            <Tag value="Leer" severity="secondary" />
                        </div>
                    </div>
                </Panel>
            </AppShell>
        </div>

        <div v-else-if="authInitialized" class="mx-auto w-full max-w-6xl p-2 text-sm">
            <div class="mx-auto w-full max-w-sm">
                <LoginForm v-if="authMode === 'login'" :prefill-username="prefilledUsername" @switch-register="authMode = 'register'" @login-success="onLogin" />
                <RegisterForm v-else @switch="authMode = 'login'" @register-success="onRegisterSuccess" />
            </div>
        </div>
    </div>
</template>
