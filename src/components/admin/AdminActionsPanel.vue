<script setup>
defineProps({
    username: {
        type: String,
        default: ''
    },
    roles: {
        type: Array,
        default: () => []
    }
});
</script>

<template>
    <Panel header="Admin Aktionen">
        <p class="mb-3 text-sm text-color-secondary">Beispielbereich fuer administrative Optionen.</p>
        <div class="flex flex-wrap gap-2">
            <Button icon="pi pi-users" label="Benutzer verwalten" severity="secondary" size="small" />
            <Button icon="pi pi-cog" label="Systemeinstellungen" severity="secondary" size="small" />
            <Button icon="pi pi-file-export" label="Audit Export" severity="secondary" size="small" />
        </div>
        <Divider />
        <p class="text-sm"><strong>Aktueller User:</strong> {{ username || 'Unbekannt' }}</p>
        <p class="text-sm mt-1"><strong>Rollen:</strong> {{ roles.join(', ') || 'keine' }}</p>
    </Panel>
</template>
