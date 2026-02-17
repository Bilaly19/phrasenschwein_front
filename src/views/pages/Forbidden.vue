<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const redirectTarget = computed(() => route.query.redirect || '/');
const requiredRoles = computed(() =>
    String(route.query.required || '')
        .split(',')
        .map((role) => role.trim())
        .filter(Boolean)
);
</script>

<template>
    <div class="card max-w-2xl">
        <h1 class="text-2xl font-semibold mb-2">Zugriff verweigert</h1>
        <p class="text-sm text-color-secondary mb-4">Du hast nicht die erforderliche Rolle fuer diese Seite.</p>
        <Tag v-if="requiredRoles.length" :value="`Erforderlich: ${requiredRoles.join(', ')}`" severity="warn" class="mb-4" />
        <div class="flex flex-wrap gap-2">
            <Button as="router-link" to="/" label="Zur Startseite" icon="pi pi-home" size="small" />
            <Button as="router-link" :to="redirectTarget" label="Erneut versuchen" icon="pi pi-refresh" severity="secondary" size="small" />
        </div>
    </div>
</template>
