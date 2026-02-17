<script setup>
import { computed } from 'vue';

const props = defineProps({
    name: String,
    data: Object,
    valuePerClick: Number,
    disabledIncrement: {
        type: Boolean,
        default: false
    },
    disabledDelete: {
        type: Boolean,
        default: false
    },
    canIncrement: {
        type: Boolean,
        default: true
    },
    canDelete: {
        type: Boolean,
        default: true
    }
});

defineEmits(['increment', 'delete']);

const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
};

const clicks = computed(() => Number(props.data?.clicks ?? props.data?.count) || 0);
const lastClickAt = computed(() => props.data?.lastClickAt || props.data?.lastClickedAt || null);

const euroBetrag = computed(() => {
    return (clicks.value * props.valuePerClick).toFixed(2);
});
</script>

<template>
    <Card>
        <template #content>
            <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                    <p class="text-sm font-semibold leading-tight">{{ name }}</p>
                    <p class="text-sm mt-1">{{ euroBetrag }} EUR</p>
                    <p v-if="lastClickAt" class="text-xs text-color-secondary mt-1">Letzter Klick: {{ formatDate(lastClickAt) }}</p>
                </div>
                <Tag :value="`${clicks} Klicks`" severity="secondary" />
            </div>
            <div class="flex gap-2 mt-3">
                <Button v-if="canIncrement" :disabled="disabledIncrement" label="+1" icon="pi pi-plus" severity="primary" size="small" class="p-button-sm" @click="$emit('increment', name)" />
                <Button v-if="canDelete" :disabled="disabledDelete" label="Loeschen" icon="pi pi-trash" severity="danger" outlined size="small" class="p-button-sm" @click="$emit('delete', name)" />
                <Tag v-if="!canIncrement && !canDelete" severity="secondary" icon="pi pi-lock" value="Nur lesen" />
            </div>
        </template>
    </Card>
</template>
