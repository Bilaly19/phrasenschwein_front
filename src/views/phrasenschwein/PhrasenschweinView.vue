<template>
    <div :class="['phrasenschwein-shell app-shell dense-ui min-h-screen', isDarkMode ? 'app-dark' : 'app-light']">
        <Toast position="top-right" />

        <header class="topbar fixed inset-x-0 top-0 z-40 h-12">
            <div class="mx-auto flex h-full w-full items-center justify-between px-4">
                <div class="flex items-center gap-2">
                    <Button icon="pi pi-bars" text rounded class="h-8 w-8" @click="sidebarOpen = !sidebarOpen" aria-label="Sidebar umschalten" />
                    <p class="text-base font-semibold leading-tight">Phrasenschwein</p>
                </div>
                <div class="flex items-center gap-2 text-sm">
                    <Button
                        :icon="isDarkMode ? 'pi pi-sun' : 'pi pi-moon'"
                        text
                        rounded
                        size="small"
                        class="h-8 w-8"
                        :aria-label="isDarkMode ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren'"
                        @click="toggleTheme"
                    />
                    <span v-if="authInitialized && isAuthenticated" class="hidden sm:inline">Eingeloggt als</span>
                    <Tag v-if="authInitialized && isAuthenticated" :value="username" severity="info" rounded />
                    <Button
                        v-if="authInitialized && isAuthenticated"
                        icon="pi pi-sign-out"
                        label="Logout"
                        text
                        size="small"
                        class="!px-2 !py-1 text-sm"
                        :disabled="loading.logout"
                        @click="handleLogout"
                    />
                </div>
            </div>
        </header>

        <div class="layout flex min-h-screen pt-12">
            <aside
                class="sidebar fixed left-0 top-12 z-30 h-[calc(100vh-48px)] w-56 overflow-y-auto transition-transform duration-200"
                :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
            >
                <nav class="space-y-1 p-2 text-sm">
                    <button
                        v-for="item in navItems"
                        :key="item.id"
                        type="button"
                        class="nav-link flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors"
                        :class="{ 'is-active': activeSection === item.id }"
                        @click="setActiveSection(item.id)"
                    >
                        <i :class="item.icon"></i>
                        <span>{{ item.label }}</span>
                    </button>
                </nav>
            </aside>

            <button v-if="sidebarOpen" type="button" class="fixed inset-0 z-20 bg-black/50 lg:hidden" @click="closeSidebar" aria-label="Sidebar schliessen"></button>

            <main class="content flex-1" :class="sidebarOpen ? 'lg:pl-56' : 'lg:pl-0'">
                <div class="mx-auto w-full max-w-4xl px-4 py-3 sm:px-5">
                    <div v-if="authInitialized && isAuthenticated" class="space-y-2.5">
                        <section class="section-card rounded-lg p-2.5 shadow-sm sm:p-3">
                            <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <h1 class="text-lg font-semibold leading-tight">Steuerung</h1>
                                <Button
                                    v-if="paypalUrl"
                                    as="a"
                                    :href="paypalUrl"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    icon="pi pi-heart"
                                    label="Spenden"
                                    severity="help"
                                    size="small"
                                    class="!px-2.5 !py-1 text-xs"
                                    title="Unterstuetze das Phrasenschwein"
                                />
                            </div>

                            <p class="mb-2 text-xs leading-snug">Verwalte Klicks, Namen und den Wert pro Klick.</p>

                            <Message v-if="errorMessage" severity="error" class="mb-2">{{ errorMessage }}</Message>
                            <Message v-if="infoMessage" severity="success" class="mb-2">{{ infoMessage }}</Message>

                            <div class="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                                <Card>
                                    <template #title>
                                        <h2 class="text-base font-semibold">Konfiguration</h2>
                                    </template>
                                    <template #content>
                                        <ClickValueInput v-model="valuePerClick" :disabled="loading.saveConfig" />
                                    </template>
                                </Card>

                                <Card>
                                    <template #title>
                                        <h2 class="text-base font-semibold">Name hinzufuegen</h2>
                                    </template>
                                    <template #content>
                                        <AddNameForm @add="addName" :disabled="loading.add || loading.fetchNames" />
                                    </template>
                                </Card>
                            </div>

                            <div class="mt-1.5">
                                <Button
                                    @click="resetAll"
                                    :disabled="loading.reset || loading.fetchNames"
                                    icon="pi pi-refresh"
                                    label="Alle Zaehler zuruecksetzen"
                                    severity="secondary"
                                    size="small"
                                    class="!px-2.5 !py-1 text-xs"
                                />
                            </div>
                        </section>

                        <section class="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <NameEntry
                                v-for="(entry, name) in names"
                                :key="name"
                                :name="name"
                                :data="entry"
                                :valuePerClick="safeValuePerClick"
                                :disabledIncrement="isNamePending(name)"
                                :disabledDelete="isNamePending(name)"
                                @increment="increment"
                                @delete="deleteName"
                            />
                        </section>
                    </div>

                    <div v-else-if="authInitialized" class="mx-auto w-full max-w-sm">
                        <LoginForm v-if="showLogin" @login-success="onLogin" @switch="showLogin = false" />
                        <RegisterForm v-else @switch="showLogin = true" />
                    </div>
                </div>
            </main>
        </div>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import NameEntry from './components/NameEntry.vue';
import AddNameForm from './components/AddNameForm.vue';
import ClickValueInput from './components/ClickValueInput.vue';
import LoginForm from './components/LoginForm.vue';
import RegisterForm from './components/RegisterForm.vue';
import { authApi, clearAuthorizationToken, getErrorMessage, namesApi } from '@/api';
import { useAuth } from '@/stores/auth';

const { token, username, isAuthenticated, login: setAuthState, clearAuthState } = useAuth();
const toast = useToast();

const names = ref({});
const valuePerClick = ref(0.5);
const showLogin = ref(true);
const sidebarOpen = ref(false);
const authInitialized = ref(false);
const paypalUrl = ref((import.meta.env.VITE_PAYPAL_URL || '').trim());
const errorMessage = ref('');
const infoMessage = ref('');
const isInitializingConfig = ref(false);
const pendingNames = ref(new Set());
const activeSection = ref('dashboard');
const isDarkMode = ref(false);
const THEME_STORAGE_KEY = 'phrasenschwein-ui-theme';

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'pi pi-home' },
    { id: 'inbox', label: 'Inbox', icon: 'pi pi-inbox' },
    { id: 'feed', label: 'Live Feed', icon: 'pi pi-bolt' },
    { id: 'quick-add', label: 'Schnell erfassen', icon: 'pi pi-plus-circle' },
    { id: 'today', label: 'Heute', icon: 'pi pi-calendar' },
    { id: 'week', label: 'Diese Woche', icon: 'pi pi-calendar-clock' },
    { id: 'history', label: 'Verlauf', icon: 'pi pi-history' },
    { id: 'top-list', label: 'Top Liste', icon: 'pi pi-trophy' },
    { id: 'reports', label: 'Reports', icon: 'pi pi-chart-line' },
    { id: 'settings', label: 'Einstellungen', icon: 'pi pi-cog' }
];

const loading = reactive({
    fetchNames: false,
    saveConfig: false,
    add: false,
    reset: false,
    logout: false
});

let saveTimer = null;
const disableAutoLogin = String(import.meta.env.VITE_DISABLE_AUTOLOGIN || '')
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

const closeSidebar = () => {
    sidebarOpen.value = false;
};

const setActiveSection = (sectionId) => {
    activeSection.value = sectionId;
    if (!window.matchMedia('(min-width: 1024px)').matches) {
        closeSidebar();
    }
};

const toggleTheme = () => {
    isDarkMode.value = !isDarkMode.value;
};

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
    } catch (error) {
        errorMessage.value = getErrorMessage(error, 'Zaehler konnte nicht erhoeht werden.');
    } finally {
        setNamePending(name, false);
    }
};

const deleteName = async (name) => {
    if (!window.confirm(`"${name}" wirklich loeschen?`)) return;

    clearMessages();
    setNamePending(name, true);
    try {
        await namesApi.deleteName(name);
        await fetchNames();
    } catch (error) {
        errorMessage.value = getErrorMessage(error, 'Name konnte nicht geloescht werden.');
    } finally {
        setNamePending(name, false);
    }
};

const resetAll = async () => {
    if (!window.confirm('Wirklich alle Zaehler zuruecksetzen?')) return;

    clearMessages();
    loading.reset = true;
    try {
        await namesApi.resetNames();
        await fetchNames();
    } catch (error) {
        errorMessage.value = getErrorMessage(error, 'Zaehler konnten nicht zurueckgesetzt werden.');
    } finally {
        loading.reset = false;
    }
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
    sidebarOpen.value = window.matchMedia('(min-width: 1024px)').matches;

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'dark') {
        isDarkMode.value = true;
    } else if (savedTheme === 'light') {
        isDarkMode.value = false;
    } else {
        isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

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

watch(isDarkMode, (next) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
});
</script>

<style scoped>
.app-shell {
    --shell-bg: #f8fafc;
    --shell-bg-soft: #f1f5f9;
    --surface: #ffffff;
    --surface-soft: #f8fafc;
    --text: #0f172a;
    --muted: #334155;
    --border: #e2e8f0;
    --topbar-bg: #ffffff;
    --sidebar-bg: #f8fafc;
    --nav-hover: #e2e8f0;
    --nav-active-bg: #dbeafe;
    --nav-active-text: #1d4ed8;
    position: relative;
    min-height: 100vh;
    color: var(--text);
    background:
        radial-gradient(circle at 8% 8%, rgb(59 130 246 / 8%) 0%, rgb(59 130 246 / 0%) 28%),
        radial-gradient(circle at 92% 8%, rgb(16 185 129 / 7%) 0%, rgb(16 185 129 / 0%) 32%),
        var(--shell-bg);
}

.app-shell.app-dark {
    --shell-bg: #050505;
    --shell-bg-soft: #0b0b0b;
    --surface: #111111;
    --surface-soft: #1a1a1a;
    --text: #f1f5f9;
    --muted: #cbd5e1;
    --border: #2a2a2a;
    --topbar-bg: #0a0a0a;
    --sidebar-bg: #0a0a0a;
    --nav-hover: #1c1c1c;
    --nav-active-bg: #2a2a2a;
    --nav-active-text: #ffffff;
}

.topbar {
    background: var(--topbar-bg);
    border-bottom: 1px solid var(--border);
}

.sidebar {
    background: var(--sidebar-bg);
    border-right: 1px solid var(--border);
}

.content {
    color: var(--text);
}

.section-card {
    border: 1px solid var(--border);
    background: var(--surface);
}

.nav-link {
    color: var(--muted);
    border-color: transparent;
}

.nav-link:hover {
    background: var(--nav-hover);
    color: var(--text);
}

.nav-link.is-active {
    background: var(--nav-active-bg);
    color: var(--nav-active-text);
    border-color: var(--nav-active-bg);
}

.phrasenschwein-shell :deep(.name-entry-card.p-card),
.phrasenschwein-shell :deep(.auth-card.p-card),
.phrasenschwein-shell :deep(.p-card) {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 0.75rem;
}

.phrasenschwein-shell :deep(.p-card .p-card-content),
.phrasenschwein-shell :deep(.p-card .p-card-footer) {
    padding: 0;
}

.phrasenschwein-shell :deep(.p-inputtext),
.phrasenschwein-shell :deep(.p-inputnumber-input) {
    height: 36px;
    padding: 0.4rem 0.55rem;
    color: var(--text);
    background: var(--surface-soft);
    border-color: var(--border);
    font-size: 0.8125rem;
}

.phrasenschwein-shell :deep(.add-name-btn.p-button) {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #0f172a;
}

.phrasenschwein-shell.app-dark :deep(.add-name-btn.p-button) {
    background: #232323;
    border-color: #3a3a3a;
    color: #f8fafc;
}
</style>
