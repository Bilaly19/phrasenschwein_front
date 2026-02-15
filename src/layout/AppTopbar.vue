<script setup>
import { useLayout } from '@/layout/composables/layout';
import { authApi, clearAuthorizationToken } from '@/api';
import { useAuth } from '@/stores/auth';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();
const { username, reset: resetAuth } = useAuth();
const router = useRouter();
const isLoggingOut = ref(false);

const navItems = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Einstellungen', to: '/einstellungen' },
    { label: 'Statistik', to: '/statistik' }
];

const currentUsername = computed(() => (username.value ? `@${username.value}` : 'Gast'));
const darkModeEnabled = computed({
    get: () => isDarkTheme.value,
    set: () => toggleDarkMode()
});

const handleLogout = async () => {
    if (isLoggingOut.value) return;

    isLoggingOut.value = true;
    try {
        await authApi.logout();
    } catch {
        // Best effort logout to clear local auth state.
    } finally {
        clearAuthorizationToken();
        resetAuth();
        isLoggingOut.value = false;
        void router.push('/phrasenschwein');
    }
};
</script>

<template>
    <header class="layout-topbar">
        <div class="layout-topbar-left">
            <Button class="layout-menu-button" text rounded icon="pi pi-bars" aria-label="Menue oeffnen" @click="toggleMenu" />
            <router-link to="/phrasenschwein" class="layout-topbar-brand">Phrasenschwein</router-link>
        </div>

        <nav class="layout-topbar-nav">
            <Button v-for="item in navItems" :key="item.to" as="router-link" :to="item.to" text size="small" class="layout-topbar-nav-item" :label="item.label" />
        </nav>

        <div class="layout-topbar-right">
            <div class="flex items-center gap-2">
                <ToggleButton v-model="darkModeEnabled" onLabel="Dunkel" offLabel="Hell" onIcon="pi pi-moon" offIcon="pi pi-sun" size="small" aria-label="Dark Mode umschalten" />
            </div>

            <Tag :value="currentUsername" severity="secondary" rounded />

        </div>
    </header>
</template>

<style scoped></style>
