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
    }
});

defineEmits(['increment', 'delete']);

const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
};

const euroBetrag = computed(() => {
    return (props.data.count * props.valuePerClick).toFixed(2);
});
</script>

<template>
    <Card>
        <template #content>
            <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                    <p class="text-sm font-semibold leading-tight">{{ name }}</p>
                    <p class="text-sm mt-1">{{ euroBetrag }} EUR</p>
                    <p v-if="data.lastClickedAt" class="text-xs text-color-secondary mt-1">Letzter Klick: {{ formatDate(data.lastClickedAt) }}</p>
                </div>
                <Tag :value="`${data.count} Klicks`" severity="secondary" />
            </div>
            <div class="flex gap-2 mt-3">
                <Button :disabled="disabledIncrement" label="+1" icon="pi pi-plus" severity="primary" size="small" class="p-button-sm" @click="$emit('increment', name)" />
                <Button :disabled="disabledDelete" label="Loeschen" icon="pi pi-trash" severity="danger" outlined size="small" class="p-button-sm" @click="$emit('delete', name)" />
            </div>
        </template>
    </Card>
</template>
