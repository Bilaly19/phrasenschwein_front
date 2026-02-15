<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import AppShell from './components/AppShell.vue';
import NameEntry from './components/NameEntry.vue';
import AddNameForm from './components/AddNameForm.vue';
import ClickValueInput from './components/ClickValueInput.vue';
import LoginForm from './components/LoginForm.vue';
import RegisterForm from './components/RegisterForm.vue';
import { authApi, clearAuthorizationToken, getErrorMessage, namesApi } from '@/api';
import { useAuth } from '@/stores/auth';

const { token, username, isAuthenticated, login: setAuthState, clearAuthState } = useAuth();
const toast = useToast();
const confirm = useConfirm();

const names = ref({});
const valuePerClick = ref(0.5);
const showLogin = ref(true);
const authInitialized = ref(false);
const paypalUrl = ref((import.meta.env.VITE_PAYPAL_URL || '').trim());
const errorMessage = ref('');
const infoMessage = ref('');
const isInitializingConfig = ref(false);
const pendingNames = ref(new Set());

const loading = reactive({
    fetchNames: false,
    saveConfig: false,
    add: false,
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

const clearMessages = () => {
    errorMessage.value = '';
    infoMessage.value = '';
};

const isNamePending = (name) => pendingNames.value.has(name);

const nameEntries = computed(() =>
    Object.entries(names.value).map(([name, data]) => ({
        name,
        data
    }))
);
const namesCount = computed(() => nameEntries.value.length);
const totalClicks = computed(() => nameEntries.value.reduce((sum, entry) => sum + (Number(entry.data?.count) || 0), 0));
const totalAmount = computed(() => (totalClicks.value * safeValuePerClick.value).toFixed(2));
const hasNames = computed(() => namesCount.value > 0);

const setNamePending = (name, active) => {
    const next = new Set(pendingNames.value);
    if (active) {
        next.add(name);
    } else {
        next.delete(name);
    }
    pendingNames.value = next;
};

const fetchNames = async () => {
    loading.fetchNames = true;
    try {
        names.value = await namesApi.getNames();
    } catch (error) {
        errorMessage.value = getErrorMessage(error, 'Namen konnten nicht geladen werden.');
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
        errorMessage.value = getErrorMessage(error, 'Konfiguration konnte nicht geladen werden.');
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
        errorMessage.value = getErrorMessage(error, 'Konfiguration konnte nicht gespeichert werden.');
    } finally {
        loading.saveConfig = false;
    }
};

const addName = async (name) => {
    clearMessages();
    loading.add = true;
    try {
        await namesApi.addName(name);
        await fetchNames();
        infoMessage.value = `"${name}" wurde hinzugefuegt.`;
    } catch (error) {
        errorMessage.value = getErrorMessage(error, 'Name konnte nicht hinzugefuegt werden.');
    } finally {
        loading.add = false;
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
        errorMessage.value = getErrorMessage(error, 'Zaehler konnte nicht erhoeht werden.');
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
        errorMessage.value = getErrorMessage(error, 'Name konnte nicht geloescht werden.');
    } finally {
        setNamePending(name, false);
    }
};

const resetAll = async () => {
    clearMessages();
    loading.reset = true;
    try {
        await namesApi.resetNames();
        await fetchNames();
        infoMessage.value = 'Alle Zaehler wurden zurueckgesetzt.';
    } catch (error) {
        errorMessage.value = getErrorMessage(error, 'Zaehler konnten nicht zurueckgesetzt werden.');
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

const requestResetAll = () => {
    confirm.require({
        message: 'Wirklich alle Zaehler zuruecksetzen?',
        header: 'Alles zuruecksetzen',
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
            void resetAll();
        }
    });
};

const handleLogout = async () => {
    clearMessages();
    loading.logout = true;
    try {
        await authApi.logout();
    } catch (error) {
        errorMessage.value = getErrorMessage(error, 'Logout konnte nicht vollstaendig abgeschlossen werden.');
    } finally {
        clearAuthorizationToken();
        clearAuthState();
        names.value = {};
        showLogin.value = true;
        authDebug('[auth] logout state reset');
        loading.logout = false;
    }
};

const onLogin = async () => {
    showLogin.value = true;
    clearMessages();
    await Promise.all([fetchNames(), loadConfig()]);
};

const onUnauthorized = (event) => {
    clearAuthorizationToken();
    clearAuthState();
    names.value = {};
    showLogin.value = true;
    infoMessage.value = event.detail || 'Bitte erneut einloggen.';
};

const initializeAuth = async () => {
    const storedToken = token.value;
    authDebug('[auth] token loaded from storage:', storedToken ? 'present' : 'missing');

    if (disableAutoLogin) {
        authDebug('[auth] auto-login disabled via VITE_DISABLE_AUTOLOGIN');
        clearAuthorizationToken();
        clearAuthState();
        names.value = {};
        showLogin.value = true;
        authInitialized.value = true;
        return;
    }

    if (!storedToken) {
        clearAuthorizationToken();
        clearAuthState();
        names.value = {};
        showLogin.value = true;
        authInitialized.value = true;
        return;
    }

    try {
        const session = await authApi.getSession();
        const resolvedUsername = session?.username || username.value;
        setAuthState(storedToken, resolvedUsername);
        showLogin.value = false;
        authDebug('[auth] session validation result: valid');
        await Promise.all([fetchNames(), loadConfig()]);
    } catch (error) {
        clearAuthorizationToken();
        clearAuthState();
        names.value = {};
        showLogin.value = true;
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
    <div class="px-3 py-3 md:px-4">
        <Toast position="top-right" />
        <ConfirmDialog />

        <div v-if="authInitialized && isAuthenticated" class="mx-auto w-full max-w-4xl text-sm">
            <AppShell>
                <template #title>
                    <div class="min-w-0">
                        <h1 class="text-xl font-semibold leading-tight">Phrasenschwein</h1>
                        <p class="text-sm text-color-secondary mt-1">Verwalte Klicks, Namen und den Wert pro Klick.</p>
                    </div>
                </template>
                <template #actions>
                    <Tag :value="username" severity="info" class="text-xs" />
                    <Button v-if="paypalUrl" as="a" :href="paypalUrl" target="_blank" rel="noopener noreferrer" icon="pi pi-heart" label="Spenden" severity="secondary" size="small" class="p-button-sm" title="Unterstuetze das Phrasenschwein" />
                    <Button icon="pi pi-sign-out" label="Logout" severity="secondary" size="small" class="p-button-sm" :disabled="loading.logout" @click="handleLogout" />
                </template>

                <div class="flex flex-col gap-3 mt-1">
                    <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <Card>
                            <template #content>
                                <p class="text-xs text-color-secondary mb-1">Namen</p>
                                <p class="text-lg font-semibold">{{ namesCount }}</p>
                            </template>
                        </Card>
                        <Card>
                            <template #content>
                                <p class="text-xs text-color-secondary mb-1">Klicks gesamt</p>
                                <p class="text-lg font-semibold">{{ totalClicks }}</p>
                            </template>
                        </Card>
                        <Card>
                            <template #content>
                                <p class="text-xs text-color-secondary mb-1">Wert pro Klick</p>
                                <p class="text-lg font-semibold">{{ totalAmount }} EUR</p>
                            </template>
                        </Card>
                    </div>

                    <Card>
                        <template #title>
                            <div class="text-base font-semibold">Steuerung</div>
                        </template>
                        <template #subtitle>
                            <p class="text-sm text-color-secondary">Konfiguration und Eingaben an einem Ort.</p>
                        </template>
                        <template #content>
                            <div class="p-fluid flex flex-col gap-3">
                                <Message v-if="errorMessage" severity="error" size="small">{{ errorMessage }}</Message>
                                <Message v-if="infoMessage" severity="success" size="small">{{ infoMessage }}</Message>

                                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <div>
                                        <h2 class="text-sm font-medium mb-2">Wert pro Klick</h2>
                                        <ClickValueInput v-model="valuePerClick" :disabled="loading.saveConfig" />
                                    </div>
                                    <div>
                                        <h2 class="text-sm font-medium mb-2">Name hinzufuegen</h2>
                                        <AddNameForm @add="addName" :disabled="loading.add || loading.fetchNames" />
                                    </div>
                                </div>

                                <Divider />
                                <div>
                                    <Button @click="requestResetAll" :disabled="loading.reset || loading.fetchNames" icon="pi pi-refresh" label="Alle Zaehler zuruecksetzen" severity="secondary" size="small" class="p-button-sm" />
                                </div>
                            </div>
                        </template>
                    </Card>

                    <Card>
                        <template #title>
                            <div class="text-base font-semibold">Namenliste</div>
                        </template>
                        <template #subtitle>
                            <p class="text-sm text-color-secondary">Klicks je Person erfassen und verwalten.</p>
                        </template>
                        <template #content>
                            <div v-if="hasNames" class="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <NameEntry
                                    v-for="entry in nameEntries"
                                    :key="entry.name"
                                    :name="entry.name"
                                    :data="entry.data"
                                    :valuePerClick="safeValuePerClick"
                                    :disabledIncrement="isNamePending(entry.name)"
                                    :disabledDelete="isNamePending(entry.name)"
                                    @increment="increment"
                                    @delete="requestDeleteName"
                                />
                            </div>
                            <div v-else class="flex flex-col items-center justify-center rounded-border border border-dashed border-surface-300 px-4 py-6 text-center">
                                <i class="pi pi-users text-3xl text-color-secondary mb-2"></i>
                                <p class="font-medium">Noch keine Namen vorhanden</p>
                                <p class="text-sm text-color-secondary mt-1">Fuege oben den ersten Namen hinzu.</p>
                                <div class="mt-3">
                                    <Tag value="Leer" severity="secondary" />
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>
            </AppShell>
        </div>

        <div v-else-if="authInitialized" class="mx-auto w-full max-w-sm text-sm">
            <LoginForm v-if="showLogin" @login-success="onLogin" @switch="showLogin = false" />
            <RegisterForm v-else @switch="showLogin = true" />
        </div>
    </div>
</template>
