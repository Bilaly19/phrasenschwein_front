<template>
  <div class="input-section">
    <input v-model="localName" placeholder="Neuen Namen eingeben" :disabled="disabled" />
    <button @click="submit" :disabled="disabled">➕ Hinzufügen</button>
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

<style scoped>
.input-section {
  margin-bottom: 15px;
}
input {
  padding: 8px;
  margin-right: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
}
button {
  padding: 8px 12px;
  font-size: 14px;
  border: none;
  border-radius: 6px;
  background-color: #ff5e5e;
  color: white;
  cursor: pointer;
}
button:hover {
  background-color: #e03e3e;
}
button:disabled,
input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
