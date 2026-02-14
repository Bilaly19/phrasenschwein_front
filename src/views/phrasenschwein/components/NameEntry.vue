<template>
  <Card class="name-entry-card h-full">
    <template #title>
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-semibold">{{ name }} 🐷</h3>
        <Tag :value="`${data.count} Klicks`" rounded class="text-xs" />
      </div>
    </template>
    <template #content>
      <div class="space-y-1.5 text-left">
        <p class="text-xs font-medium">{{ euroBetrag }} EUR</p>
        <p class="text-xs opacity-70" v-if="data.lastClickedAt">Letzter Klick: {{ formatDate(data.lastClickedAt) }}</p>
      </div>
    </template>
    <template #footer>
      <div class="mt-1 flex items-center gap-1.5">
        <Button
          :disabled="disabledIncrement"
          label="+1"
          icon="pi pi-plus"
          severity="contrast"
          size="small"
          class="!px-2.5 !py-1 text-xs"
          @click="$emit('increment', name)"
        />
        <Button
          :disabled="disabledDelete"
          label="Loeschen"
          icon="pi pi-trash"
          severity="danger"
          text
          size="small"
          class="!px-2.5 !py-1 text-xs"
          @click="$emit('delete', name)"
        />
      </div>
    </template>
  </Card>
</template>

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
