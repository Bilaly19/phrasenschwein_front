<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useRoute, useRouter } from 'vue-router';
import AppShell from '@/views/phrasenschwein/components/AppShell.vue';
import NameEntry from '@/views/phrasenschwein/components/NameEntry.vue';
import ClickValueInput from '@/views/phrasenschwein/components/ClickValueInput.vue';
import LoginForm from '@/views/phrasenschwein/components/LoginForm.vue';
import RegisterForm from '@/views/phrasenschwein/components/RegisterForm.vue';
import { authApi, clearAuthorizationToken, getErrorMessage, pigsApi } from '@/api';
import { useAuth } from '@/stores/auth';
import { resolveSessionRoles } from '@/utils/authRoles';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

const { token, username, isAuthenticated, login: setAuthState, reset: resetAuth } = useAuth();

const pigId = computed(() => String(route.params?.pigId || '').trim());

const pigTitle = ref('');
const pigRole = ref('member');
const latestInviteLink = ref('');

const names = ref({});
const valuePerClick = ref(0.5);
const authInitialized = ref(false);
const authMode = ref('login');
const prefilledUsername = ref('');
const errorMessage = ref('');
const infoMessage = ref('');
const isInitializingConfig = ref(false);
const pendingNames = ref(new Set());

const loading = reactive({
    fetchNames: false,
    saveConfig: false,
    reset: false,
    logout: false,
    invite: false
});

let saveTimer = null;

const isPigAdmin = computed(() => pigRole.value === 'admin');
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

const loadPigMeta = async () => {
    pigTitle.value = '';
    pigRole.value = 'member';

    const res = await pigsApi.listPigs();
    const pigs = Array.isArray(res?.pigs) ? res.pigs : [];
    const current = pigs.find((pig) => pig && pig.id === pigId.value);

    if (!current) {
        throw new Error('Phrasenschwein nicht gefunden oder kein Zugriff.');
    }

    pigTitle.value = current.title || 'Phrasenschwein';
    pigRole.value = current.role || 'member';
};

const fetchNames = async () => {
    if (!pigId.value) {
        errorMessage.value = 'Phrasenschwein fehlt.';
        return;
    }

    loading.fetchNames = true;
    try {
        const payload = await pigsApi.getNames(pigId.value);
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
    if (!pigId.value) return;

    loading.saveConfig = true;
    isInitializingConfig.value = true;
    try {
        const config = await pigsApi.getConfig(pigId.value);
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
    if (!Number.isFinite(val) || !pigId.value) return;

    loading.saveConfig = true;
    try {
        await pigsApi.updateConfig(pigId.value, val);
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
        await pigsApi.incrementMine(pigId.value, name);
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
        await pigsApi.deleteMine(pigId.value, name);
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
        await pigsApi.resetMine(pigId.value);
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
        loading.logout = false;
        await router.replace({ name: 'pigs' });
    }
};

const onLogin = async () => {
    clearMessages();
    authMode.value = 'login';

    try {
        await loadPigMeta();
        await Promise.all([fetchNames(), loadConfig()]);
    } catch (error) {
        errorMessage.value = error?.message || formatApiError(error, 'Phrasenschwein konnte nicht geladen werden.');
        await router.replace({ name: 'pigs' });
        return;
    }

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
    if (!storedToken) {
        clearAuthorizationToken();
        resetAuth();
        names.value = {};
        authInitialized.value = true;
        return;
    }

    try {
        const session = await authApi.getSession();
        const resolvedUsername = session?.username || username.value;
        const resolvedRoles = resolveSessionRoles(session);
        setAuthState(storedToken, resolvedUsername, resolvedRoles);
        await onLogin();
    } catch {
        clearAuthorizationToken();
        resetAuth();
        names.value = {};
    } finally {
        authInitialized.value = true;
    }
};

const createInvite = async () => {
    clearMessages();
    if (!pigId.value) return;

    loading.invite = true;
    try {
        const res = await pigsApi.createInvite(pigId.value, { maxUses: 1, ttlHours: 24 * 7 });
        const tokenValue = String(res?.token || '').trim();
        if (!tokenValue) {
            throw new Error('Invite token missing in response.');
        }

        latestInviteLink.value = `${window.location.origin}/invite/${tokenValue}`;
        infoMessage.value = 'Invite erstellt.';

        try {
            await navigator.clipboard.writeText(latestInviteLink.value);
            toast.add({ severity: 'success', summary: 'Invite', detail: 'Link kopiert', life: 2000 });
        } catch {
            // ignore
        }
    } catch (error) {
        errorMessage.value = formatApiError(error, 'Invite konnte nicht erstellt werden.');
    } finally {
        loading.invite = false;
    }
};

onMounted(() => {
    window.addEventListener('auth:unauthorized', onUnauthorized);
    void initializeAuth();
});

onBeforeUnmount(() => {
    window.removeEventListener('auth:unauthorized', onUnauthorized);
    if (saveTimer) window.clearTimeout(saveTimer);
});

watch(valuePerClick, (nextVal) => {
    if (isInitializingConfig.value) return;
    if (!isPigAdmin.value) return;

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
                        <h1 class="text-xl font-semibold leading-tight">{{ pigTitle || 'Phrasenschwein' }}</h1>
                        <p class="mt-1 text-sm text-color-secondary">Pig-ID: {{ pigId }}</p>
                    </div>
                </template>
                <template #actions>
                    <Button icon="pi pi-arrow-left" label="Zurueck" severity="secondary" size="small" class="p-button-sm w-full sm:w-auto" @click="router.push({ name: 'pigs' })" />
                    <Tag :value="`Eingeloggt als @${username}`" severity="info" class="text-xs w-fit" />
                    <Tag :value="isPigAdmin ? 'Admin' : 'Mitglied'" :severity="isPigAdmin ? 'success' : 'secondary'" class="text-xs w-fit" />
                    <Button icon="pi pi-users" label="Invite" severity="secondary" size="small" class="p-button-sm w-full sm:w-auto" :disabled="loading.invite || !isPigAdmin" @click="createInvite" />
                    <Button icon="pi pi-sign-out" label="Logout" severity="secondary" size="small" class="p-button-sm w-full sm:w-auto" :disabled="loading.logout" @click="handleLogout" />
                </template>

                <Message v-if="latestInviteLink" severity="info" class="mb-3">
                    Invite-Link (1 Woche gueltig): <span class="font-mono break-all">{{ latestInviteLink }}</span>
                </Message>

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
                        <ClickValueInput v-model="valuePerClick" :disabled="loading.saveConfig || !isPigAdmin" />
                        <small v-if="!isPigAdmin" class="text-color-secondary text-xs">Nur Admin kann den Wert aendern.</small>
                    </div>
                </Panel>

                <Panel header="Mein Eintrag" class="mb-3">
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div class="text-sm text-color-secondary">Du kannst nur deinen eigenen Namen inkrementieren/loeschen.</div>
                        <div class="flex gap-2">
                            <Button
                                icon="pi pi-refresh"
                                label="Zuruecksetzen"
                                severity="secondary"
                                size="small"
                                class="p-button-sm"
                                :disabled="loading.reset || !ownEntryExists"
                                @click="requestResetMine"
                            />
                        </div>
                    </div>
                </Panel>

                <Panel header="Board">
                    <div v-if="loading.fetchNames" class="text-color-secondary">Laedt...</div>

                    <div v-else-if="!hasNames" class="text-color-secondary">Noch keine Eintraege.</div>

                    <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <NameEntry
                            v-for="entry in nameEntries"
                            :key="entry.name"
                            :name="entry.name"
                            :data="entry.data"
                            :is-own="isOwnEntry(entry.name)"
                            :pending="isNamePending(entry.name)"
                            @increment="increment(entry.name)"
                            @delete="requestDeleteName(entry.name)"
                        />
                    </div>
                </Panel>
            </AppShell>
        </div>

        <div v-else-if="authInitialized && !isAuthenticated" class="mx-auto max-w-xl">
            <RegisterForm v-if="authMode === 'register'" @switch="authMode = 'login'" @register-success="onRegisterSuccess" />
            <LoginForm v-else :prefill-username="prefilledUsername" @switch-register="authMode = 'register'" @login-success="onLogin" />
        </div>

        <div v-else class="text-center text-color-secondary">Initialisiere...</div>
    </div>
</template>
