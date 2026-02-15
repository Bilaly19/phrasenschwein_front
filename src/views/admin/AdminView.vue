<script setup>
import AdminActionsPanel from '@/components/admin/AdminActionsPanel.vue';
import { useAuth } from '@/stores/auth';
import { computed } from 'vue';

const { username, roles } = useAuth();
const roleCount = computed(() => roles.value.length);
</script>

<template>
    <div class="card">
        <div class="mb-4">
            <h1 class="text-2xl font-semibold">Admin Bereich</h1>
            <p class="mt-1 text-sm text-color-secondary">Diese Seite ist nur mit der Rolle <code>admin</code> erreichbar.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Panel header="Status">
                <Tag value="admin" severity="danger" />
            </Panel>
            <Panel header="Benutzer">
                <p class="text-lg font-semibold">{{ username || '-' }}</p>
            </Panel>
            <Panel header="Rollenanzahl">
                <p class="text-lg font-semibold">{{ roleCount }}</p>
            </Panel>
        </div>

        <AdminActionsPanel :username="username" :roles="roles" />
    </div>
</template>
