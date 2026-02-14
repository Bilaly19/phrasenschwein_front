<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
    <InputText
      v-model="localName"
      placeholder="Neuen Namen eingeben"
      :disabled="disabled"
      class="w-full sm:max-w-[280px]"
      @keyup.enter="submit"
    />
    <Button
      @click="submit"
      :disabled="disabled"
      label="Hinzufuegen"
      icon="pi pi-plus"
      severity="contrast"
      size="small"
      class="add-name-btn !px-2.5 !py-1 text-xs"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['add']);
const localName = ref('');

const submit = () => {
  if (props.disabled) return;

  const trimmed = localName.value.trim();
  if (trimmed) {
    emit('add', trimmed);
    localName.value = '';
  }
};
</script>
