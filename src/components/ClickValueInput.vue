<template>
  <div class="input-section">
    <label for="clickValue">Wert pro Klick (€):</label>
    <input
        id="clickValue"
        type="number"
        step="0.01"
        :value="modelValue"
        @input="$emit('update:modelValue', parseFloat($event.target.value))"
    />
  </div>
</template>

<script setup>
defineProps(['modelValue']);
defineEmits(['update:modelValue']);
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
</style>
