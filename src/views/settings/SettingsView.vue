<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { authApi, clearAuthorizationToken, getErrorMessage, pigsApi, resolveApiBaseUrl } from '@/api';
import { useAuth } from '@/stores/auth';
import { usePigPortfolio } from '@/composables/usePigPortfolio';

const START_ROUTE_KEY = 'defaultStartRoute';
const ALLOWED_START_ROUTES = ['/pigs', '/dashboard', '/statistik'];

const router = useRouter();
const toast = useToast();
const { username, roles, reset: resetAuth } = useAuth();
const { pigs, loading, refreshing, errorMessage, refresh } = usePigPortfolio();

const startRouteOptions = [
    { label: 'Phrasenschweine', value: '/pigs' },
    { label: 'Dashboard', value: '/dashboard' },
    { label: 'Statistik', value: '/statistik' }
];

const readStoredStartRoute = () => {
    try {
        const value = window.localStorage.getItem(START_ROUTE_KEY);
        return ALLOWED_START_ROUTES.includes(value) ? value : '/pigs';
    } catch {
        return '/pigs';
    }
};

const normalizePaypalLink = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw.replace(/^\/+/, '')}`;
};

const defaultStartRoute = ref('/pigs');
const savingStartRoute = ref(false);
const loggingOut = ref(false);
const saveStates = reactive({});
const configDrafts = ref({});
const apiBase = resolveApiBaseUrl();
const apiBaseLabel = apiBase || 'same-origin';

const adminPigs = computed(() => pigs.value.filter((pig) => pig.role === 'admin'));

const ensureConfigDraft = (pig) => {
    if (!pig?.id) return;
    if (!configDrafts.value[pig.id]) {
        configDrafts.value[pig.id] = {
            valuePerClick: pig.valuePerClick,
            paypalLink: pig.paypalLink || ''
        };
    }
};

watch(
    () => pigs.value,
    (nextPigs) => {
        nextPigs.forEach((pig) => ensureConfigDraft(pig));
    },
    { immediate: true }
);

const saveStartRoute = async () => {
    savingStartRoute.value = true;
    try {
        const nextRoute = ALLOWED_START_ROUTES.includes(defaultStartRoute.value) ? defaultStartRoute.value : '/pigs';
        window.localStorage.setItem(START_ROUTE_KEY, nextRoute);
        toast.add({ severity: 'success', summary: 'Einstellungen', detail: 'Startseite gespeichert.', life: 2500 });
    } finally {
        savingStartRoute.value = false;
    }
};

const savePigConfig = async (pigId) => {
    const draft = configDrafts.value[pigId];
    if (!draft) return;

    const valuePerClick = Number.parseFloat(draft.valuePerClick);
    if (!Number.isFinite(valuePerClick) || valuePerClick < 0) {
        toast.add({ severity: 'error', summary: 'Konfiguration', detail: 'Bitte einen gueltigen Wert pro Klick eingeben.', life: 3000 });
        return;
    }

    saveStates[pigId] = true;
    try {
        await pigsApi.updateConfig(pigId, {
            valuePerClick,
            paypalLink: normalizePaypalLink(draft.paypalLink)
        });
        await refresh();
        toast.add({ severity: 'success', summary: 'Konfiguration', detail: 'Board-Einstellungen gespeichert.', life: 2500 });
    } catch (error) {
        const message = getErrorMessage(error, 'Konfiguration konnte nicht gespeichert werden.');
        toast.add({ severity: 'error', summary: 'Konfiguration', detail: message, life: 3500 });
    } finally {
        saveStates[pigId] = false;
    }
};

const logout = async () => {
    loggingOut.value = true;
    try {
        await authApi.logout();
    } catch {
        // best effort
    } finally {
        clearAuthorizationToken();
        resetAuth();
        loggingOut.value = false;
        await router.replace({ name: 'pigs' });
    }
};

onMounted(() => {
    defaultStartRoute.value = readStoredStartRoute();
    void refresh();
});
</script>

<template>
    <div class="apple-scene p-2">
        <section class="apple-hero apple-reveal">
            <div class="min-w-0">
                <p class="apple-hero__eyebrow">Einstellungen</p>
                <h1 class="apple-hero__title">App und Boards konfigurieren</h1>
                <p class="apple-hero__subtitle">Lege deine Startseite fest und bearbeite Board-Konfigurationen zentral als Admin.</p>
                <div class="apple-quick-stats">
                    <span class="apple-stat-pill">User: @{{ username || '-' }}</span>
                    <span class="apple-stat-pill">{{ adminPigs.length }} Admin-Boards</span>
                    <span class="apple-stat-pill">API: {{ apiBaseLabel }}</span>
                </div>
            </div>
            <div class="apple-hero__actions">
                <Button
                    icon="pi pi-refresh"
                    label="Daten neu laden"
                    size="small"
                    class="apple-pill p-button-sm"
                    :loading="refreshing"
                    :disabled="loading || refreshing"
                    @click="refresh"
                />
                <Button
                    icon="pi pi-sign-out"
                    label="Logout"
                    severity="secondary"
                    size="small"
                    class="apple-pill p-button-sm"
                    :loading="loggingOut"
                    @click="logout"
                />
            </div>
        </section>

        <Message v-if="errorMessage" severity="error" class="apple-banner mt-3">{{ errorMessage }}</Message>

        <div class="grid grid-cols-1 gap-3 mt-3 xl:grid-cols-2">
            <Panel header="Startseite" class="apple-panel">
                <p class="text-sm text-color-secondary mb-3">Diese Seite wird geoeffnet, wenn du auf `/` gehst.</p>
                <SelectButton
                    v-model="defaultStartRoute"
                    :options="startRouteOptions"
                    optionLabel="label"
                    optionValue="value"
                    :allowEmpty="false"
                    class="w-full"
                />
                <Button
                    class="apple-pill p-button-sm mt-3"
                    size="small"
                    icon="pi pi-save"
                    label="Startseite speichern"
                    :loading="savingStartRoute"
                    @click="saveStartRoute"
                />
            </Panel>

            <Panel header="Profil" class="apple-panel">
                <div class="grid grid-cols-1 gap-2 text-sm">
                    <div>
                        <p class="text-xs text-color-secondary">Benutzername</p>
                        <p class="font-semibold">@{{ username || '-' }}</p>
                    </div>
                    <div>
                        <p class="text-xs text-color-secondary">Rollen</p>
                        <div class="flex flex-wrap gap-2 mt-1">
                            <Tag v-for="role in roles" :key="role" :value="role" :severity="role === 'admin' ? 'success' : 'secondary'" class="text-xs" />
                            <span v-if="!roles.length" class="text-color-secondary">Keine Rollen gefunden.</span>
                        </div>
                    </div>
                </div>
            </Panel>
        </div>

        <Panel header="Board-Konfigurationen (Admin)" class="apple-panel mt-3">
            <div v-if="loading" class="text-color-secondary">Laedt Board-Einstellungen...</div>
            <div v-else-if="!adminPigs.length" class="text-color-secondary">Du bist aktuell in keinem Board als Admin eingetragen.</div>
            <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Card v-for="pig in adminPigs" :key="pig.id" class="apple-card">
                    <template #title>
                        <div class="flex items-center justify-between gap-2">
                            <span class="truncate">{{ pig.title }}</span>
                            <Tag value="Admin" severity="success" class="text-xs" />
                        </div>
                    </template>
                    <template #content>
                        <div v-if="configDrafts[pig.id]" class="p-fluid flex flex-col gap-3">
                            <div>
                                <label class="block text-xs text-color-secondary mb-1">Wert pro Klick (EUR)</label>
                                <InputNumber
                                    v-model="configDrafts[pig.id].valuePerClick"
                                    :minFractionDigits="2"
                                    :maxFractionDigits="2"
                                    :useGrouping="false"
                                    inputClass="w-full"
                                    class="w-full"
                                />
                            </div>
                            <div>
                                <label class="block text-xs text-color-secondary mb-1">PayPal-Link</label>
                                <InputText
                                    v-model="configDrafts[pig.id].paypalLink"
                                    placeholder="https://paypal.me/deinname"
                                    class="w-full"
                                />
                            </div>
                            <div class="flex gap-2">
                                <Button
                                    size="small"
                                    icon="pi pi-save"
                                    label="Speichern"
                                    class="apple-pill p-button-sm"
                                    :loading="Boolean(saveStates[pig.id])"
                                    @click="savePigConfig(pig.id)"
                                />
                                <Button
                                    size="small"
                                    icon="pi pi-arrow-right"
                                    label="Board"
                                    severity="secondary"
                                    class="apple-pill p-button-sm"
                                    @click="router.push({ name: 'pig', params: { pigId: pig.id } })"
                                />
                            </div>
                        </div>
                    </template>
                </Card>
            </div>
        </Panel>
    </div>
</template>
