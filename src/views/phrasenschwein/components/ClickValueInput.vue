<template>
  <div class="flex flex-col gap-1.5 sm:flex-row sm:items-center">
    <label for="clickValue" class="text-xs font-medium">Wert pro Klick (EUR):</label>
    <InputNumber
      id="clickValue"
      :modelValue="displayValue"
      :disabled="disabled"
      :minFractionDigits="2"
      :maxFractionDigits="2"
      :useGrouping="false"
      inputClass="w-full h-9"
      class="w-full sm:max-w-[280px]"
      @update:modelValue="onInput"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Number,
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

const displayValue = computed(() => (Number.isFinite(props.modelValue) ? props.modelValue : ''));

const onInput = (nextValue) => {
  emit('update:modelValue', Number.isFinite(nextValue) ? nextValue : null);
};
</script>
