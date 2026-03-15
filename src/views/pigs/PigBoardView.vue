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
const paypalLink = ref('');
const lastSavedConfig = ref({ valuePerClick: 0.5, paypalLink: '' });
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
const normalizePaypalLink = (val) => {
    const raw = String(val || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw.replace(/^\/+/, '')}`;
};
const safePaypalLink = computed(() => normalizePaypalLink(paypalLink.value));
const ownEntryExists = computed(() => Boolean(username.value && Object.prototype.hasOwnProperty.call(names.value, username.value)));
const ownClicks = computed(() => {
    const me = username.value;
    if (!me) return 0;
    const entry = names.value?.[me];
    return Number(entry?.clicks ?? entry?.count) || 0;
});
const ownAmount = computed(() => (ownClicks.value * safeValuePerClick.value).toFixed(2));

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

const fetchNames = async ({ silent = false } = {}) => {
    if (!pigId.value) {
        errorMessage.value = 'Phrasenschwein fehlt.';
        return;
    }

    if (!silent) {
        loading.fetchNames = true;
    }
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
        if (!silent) {
            loading.fetchNames = false;
        }
    }
};

const loadConfig = async () => {
    if (!pigId.value) return;

    loading.saveConfig = true;
    isInitializingConfig.value = true;
    try {
        const config = await pigsApi.getConfig(pigId.value);
        const nextValue = Number.parseFloat(config?.valuePerClick);
        const resolvedValue = Number.isFinite(nextValue) ? nextValue : 0.5;
        const resolvedPaypal = typeof config?.paypalLink === 'string' ? config.paypalLink : '';
        valuePerClick.value = resolvedValue;
        paypalLink.value = resolvedPaypal;
        lastSavedConfig.value = { valuePerClick: resolvedValue, paypalLink: normalizePaypalLink(resolvedPaypal) };
    } catch (error) {
        errorMessage.value = formatApiError(error, 'Konfiguration konnte nicht geladen werden.');
    } finally {
        loading.saveConfig = false;
        isInitializingConfig.value = false;
    }
};

const saveConfig = async ({ valuePerClick: nextValue, paypalLink: nextPaypalLink }) => {
    if (!Number.isFinite(nextValue) || !pigId.value) return;

    loading.saveConfig = true;
    try {
        const normalizedPaypal = normalizePaypalLink(nextPaypalLink);
        await pigsApi.updateConfig(pigId.value, {
            valuePerClick: nextValue,
            paypalLink: normalizedPaypal
        });
        lastSavedConfig.value = { valuePerClick: nextValue, paypalLink: normalizedPaypal };
    } catch (error) {
        errorMessage.value = formatApiError(error, 'Konfiguration konnte nicht gespeichert werden.');
    } finally {
        loading.saveConfig = false;
    }
};

const isConfigDirty = computed(() => {
    const currentValue = Number.isFinite(valuePerClick.value) ? valuePerClick.value : 0.5;
    const currentPaypal = normalizePaypalLink(paypalLink.value);
    return currentValue !== lastSavedConfig.value.valuePerClick || currentPaypal !== lastSavedConfig.value.paypalLink;
});

const flushConfigSave = async () => {
    if (isInitializingConfig.value) return;
    if (!isPigAdmin.value) return;
    if (!pigId.value) return;
    if (!isConfigDirty.value) return;

    if (saveTimer) {
        window.clearTimeout(saveTimer);
        saveTimer = null;
    }

    const currentValue = Number.isFinite(valuePerClick.value) ? valuePerClick.value : 0.5;
    await saveConfig({ valuePerClick: currentValue, paypalLink: paypalLink.value });
};

const increment = async (name) => {
    clearMessages();
    setNamePending(name, true);
    const previousEntry = names.value?.[name] ? { ...names.value[name] } : null;
    if (previousEntry) {
        const nextClicks = (Number(previousEntry.clicks ?? previousEntry.count) || 0) + 1;
        names.value = {
            ...names.value,
            [name]: {
                ...previousEntry,
                clicks: nextClicks,
                lastClickAt: new Date().toISOString()
            }
        };
    }

    try {
        await pigsApi.incrementMine(pigId.value, name);
        void fetchNames({ silent: true });
    } catch (error) {
        if (previousEntry) {
            names.value = {
                ...names.value,
                [name]: previousEntry
            };
        }
        errorMessage.value = formatApiError(error, 'Zaehler konnte nicht erhoeht werden.');
    } finally {
        setNamePending(name, false);
    }
};

const resetMine = async () => {
    clearMessages();
    loading.reset = true;
    const ownName = username.value;
    const previousEntry = ownName && names.value?.[ownName] ? { ...names.value[ownName] } : null;
    if (previousEntry && ownName) {
        names.value = {
            ...names.value,
            [ownName]: {
                ...previousEntry,
                clicks: 0,
                lastClickAt: null
            }
        };
    }

    try {
        await pigsApi.resetMine(pigId.value);
        void fetchNames({ silent: true });
        infoMessage.value = 'Mein Zaehler wurde zurueckgesetzt.';
    } catch (error) {
        if (previousEntry && ownName) {
            names.value = {
                ...names.value,
                [ownName]: previousEntry
            };
        }
        errorMessage.value = formatApiError(error, 'Zaehler konnte nicht zurueckgesetzt werden.');
    } finally {
        loading.reset = false;
    }
};

const requestResetMine = () => {
    confirm.require({
        message: 'Glückwunsch! Du hast bezahlt',
        header: 'Ich habe bezahlt',
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
        // best-effort: don't lose pending auto-save on logout
        await flushConfigSave();
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

watch([valuePerClick, paypalLink], ([nextVal, nextLink]) => {
    if (isInitializingConfig.value) return;
    if (!isPigAdmin.value) return;
    if (!isConfigDirty.value) return;

    if (saveTimer) {
        window.clearTimeout(saveTimer);
    }

    saveTimer = window.setTimeout(() => {
        if (!Number.isFinite(nextVal)) {
            errorMessage.value = 'Bitte einen gueltigen Zahlenwert fuer "Wert pro Klick" eingeben.';
            return;
        }

        saveConfig({
            valuePerClick: nextVal,
            paypalLink: typeof nextLink === 'string' ? nextLink.trim() : ''
        });
    }, 2000);
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
    <div class="apple-scene apple-board p-2">
        <ConfirmDialog />

        <div v-if="authInitialized && isAuthenticated" class="mx-auto w-full max-w-6xl text-sm">
            <AppShell class="apple-reveal">
                <template #title>
                    <div class="min-w-0">
                        <p class="apple-hero__eyebrow">Board</p>
                        <h1 class="apple-hero__title">{{ pigTitle || 'Phrasenschwein' }}</h1>
                        <p class="apple-hero__subtitle">Pig-ID: {{ pigId }}</p>
                    </div>
                </template>
                <template #actions>
                    <Button icon="pi pi-arrow-left" label="Zurueck" severity="secondary" size="small" class="apple-pill p-button-sm w-full sm:w-auto" @click="router.push({ name: 'pigs' })" />
                    <Tag :value="`Eingeloggt als @${username}`" severity="info" class="apple-pill text-xs w-fit" />
                    <Tag :value="isPigAdmin ? 'Admin' : 'Mitglied'" :severity="isPigAdmin ? 'success' : 'secondary'" class="apple-pill text-xs w-fit" />
                    <Button icon="pi pi-users" label="Invite" severity="secondary" size="small" class="apple-pill p-button-sm w-full sm:w-auto" :disabled="loading.invite || !isPigAdmin" @click="createInvite" />
                    <Button icon="pi pi-sign-out" label="Logout" severity="secondary" size="small" class="apple-pill p-button-sm w-full sm:w-auto" :disabled="loading.logout" @click="handleLogout" />
                </template>

                <Message v-if="latestInviteLink" severity="info" class="apple-banner mb-3">
                    Invite-Link (1 Woche gueltig): <span class="font-mono break-all">{{ latestInviteLink }}</span>
                </Message>

                <div class="apple-metric-grid mb-3">
                    <Panel header="Namen" class="apple-panel apple-metric apple-reveal apple-reveal-delay-1">
                        <p class="apple-metric-number">{{ namesCount }}</p>
                    </Panel>
                    <Panel header="Klicks gesamt" class="apple-panel apple-metric apple-reveal apple-reveal-delay-2">
                        <p class="apple-metric-number">{{ totalClicks }}</p>
                    </Panel>
                    <Panel header="Wert gesamt" class="apple-panel apple-metric apple-reveal apple-reveal-delay-3">
                        <p class="apple-metric-number">{{ totalAmount }} EUR</p>
                    </Panel>
                </div>

                <p class="apple-section-headline">Konfiguration</p>
                <Panel header="Konfiguration" class="apple-panel mb-3">
                    <div class="p-fluid">
                        <ClickValueInput v-model="valuePerClick" :disabled="loading.saveConfig || !isPigAdmin" />
                        <div class="mt-3">
                            <label class="block text-xs text-color-secondary mb-1">PayPal-Link (Empfaenger)</label>
                            <InputText
                                v-model="paypalLink"
                                placeholder="https://paypal.me/deinname"
                                :disabled="loading.saveConfig || !isPigAdmin"
                                class="w-full"
                                @blur="flushConfigSave"
                            />
                        </div>
                        <small v-if="!isPigAdmin" class="text-color-secondary text-xs">Nur Admin kann Konfiguration aendern.</small>
                    </div>
                </Panel>

                <p class="apple-section-headline">Mein Betrag</p>
                <Panel header="Mein Eintrag" class="apple-panel mb-3">
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div class="min-w-0">
                            <div class="text-sm text-color-secondary">
                                Du schuldest aktuell: <span class="font-semibold text-color">{{ ownAmount }} EUR</span>
                                <span class="text-xs">({{ ownClicks }} Klicks)</span>
                            </div>

                            <a
                                v-if="safePaypalLink"
                                :href="safePaypalLink"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="apple-paypal mt-2 group flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-0 px-3 py-2 shadow-sm hover:shadow transition-shadow"
                            >
                                <div class="h-9 w-9 rounded-md bg-[#003087] text-white flex items-center justify-center font-bold">
                                    P
                                </div>
                                <div class="min-w-0">
                                    <div class="text-sm font-semibold leading-tight">
                                        <span class="text-[#003087]">Pay</span><span class="text-[#009cde]">Pal</span>
                                        <span class="ml-2 font-normal text-color-secondary">oeffnen</span>
                                    </div>
                                    <div class="text-xs text-color-secondary truncate">Empfaenger-Link ist pro Phrasenschwein konfigurierbar.</div>
                                </div>
                                <i class="pi pi-external-link ml-auto text-color-secondary group-hover:text-color" />
                            </a>
                            <small v-else class="block mt-2 text-xs text-color-secondary">
                                Kein PayPal-Link hinterlegt. Admin kann ihn in der Konfiguration setzen.
                            </small>
                        </div>

                        <div class="flex gap-2">
                            <Button
                                icon="pi pi-check"
                                label="Ich habe bezahlt"
                                severity="secondary"
                                size="small"
                                class="apple-pill p-button-sm"
                                :disabled="loading.reset || !ownEntryExists"
                                @click="requestResetMine"
                            />
                        </div>
                    </div>
                </Panel>

                <p class="apple-section-headline">Board</p>
                <Panel header="Board" class="apple-panel apple-board-list">
                    <div v-if="loading.fetchNames && !hasNames" class="text-color-secondary">Laedt...</div>

                    <div v-else-if="!hasNames" class="text-color-secondary">Noch keine Eintraege.</div>

                    <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <NameEntry
                            v-for="entry in nameEntries"
                            :key="entry.name"
                            :name="entry.name"
                            :data="entry.data"
                            :valuePerClick="safeValuePerClick"
                            :canIncrement="isOwnEntry(entry.name)"
                            :disabledIncrement="isNamePending(entry.name) || !isOwnEntry(entry.name)"
                            @increment="increment"
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


