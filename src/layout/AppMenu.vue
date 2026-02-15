<script setup>
import AppMenuItem from './AppMenuItem.vue';

const model = [
    {
        label: 'Phrasenschwein',
        icon: 'pi pi-fw pi-wallet',
        to: '/phrasenschwein'
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
    }
];
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
