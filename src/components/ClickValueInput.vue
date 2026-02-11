<template>
  <div class="input-section">
    <label for="clickValue">Wert pro Klick (€):</label>
    <input
      id="clickValue"
      type="number"
      step="0.01"
      :value="displayValue"
      :disabled="disabled"
      @input="onInput"
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

const onInput = (event) => {
  const rawValue = event.target.value;
  const parsedValue = parseFloat(rawValue);

  emit('update:modelValue', Number.isFinite(parsedValue) ? parsedValue : null);
};
</script>

<style scoped>
.input-section {
  margin-bottom: 15px;
}
input {
  padding: 8px;
  margin-left: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  width: 100px;
}
input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
