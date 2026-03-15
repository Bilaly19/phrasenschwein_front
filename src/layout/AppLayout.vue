<script setup>
import { useLayout } from '@/layout/composables/layout';
import { computed } from 'vue';
import PhrasenAgentWidget from '@/components/assistant/PhrasenAgentWidget.vue';
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';

const { layoutConfig, layoutState, hideMobileMenu } = useLayout();

const containerClass = computed(() => {
    return {
        'layout-overlay': layoutConfig.menuMode === 'overlay',
        'layout-static': layoutConfig.menuMode === 'static',
        'layout-overlay-active': layoutState.overlayMenuActive,
        'layout-mobile-active': layoutState.mobileMenuActive,
        'layout-static-inactive': layoutState.staticMenuInactive
    };
});
</script>

<template>
    <div class="layout-wrapper" :class="containerClass">
        <AppTopbar />
        <div class="layout-body">
            <AppSidebar />
            <div class="layout-main-container">
                <main class="layout-main">
                    <router-view />
                </main>
            </div>
        </div>
        <div class="layout-mask animate-fadein" @click="hideMobileMenu" />
    </div>
    <Toast position="top-right" />
    <PhrasenAgentWidget />
</template>
