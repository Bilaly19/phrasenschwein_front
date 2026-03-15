<script setup>
import AppMenuItem from './AppMenuItem.vue';
import { computed } from 'vue';
import { useAuth } from '@/stores/auth';
import { hasAnyRequiredRole } from '@/utils/accessControl';

const { roles } = useAuth();

const menuItems = [
    {
        label: 'Phrasenschweine',
        icon: 'pi pi-fw pi-wallet',
        to: '/pigs'
    },
    {
        label: 'Dashboard',
        icon: 'pi pi-fw pi-home',
        to: '/dashboard'
    },
    {
        label: 'Einstellungen',
        icon: 'pi pi-fw pi-cog',
        to: '/einstellungen'
    },
    {
        label: 'Statistik',
        icon: 'pi pi-fw pi-chart-line',
        to: '/statistik'
    },
    {
        label: 'PhrasenAgent',
        icon: 'pi pi-fw pi-comments',
        to: '/assistant'
    },
    {
        label: 'Admin',
        icon: 'pi pi-fw pi-shield',
        to: '/admin',
        roles: ['admin']
    }
];

const isVisibleForRoles = (item, currentRoles) => {
    const requiredRoles = item.roles ?? item.role;
    if (!requiredRoles) {
        return true;
    }

    return hasAnyRequiredRole(currentRoles, requiredRoles);
};

const model = computed(() => menuItems.filter((item) => isVisibleForRoles(item, roles.value)));
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item.to">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>

