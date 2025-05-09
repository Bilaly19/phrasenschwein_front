<template>
  <div class="entry">
    <span class="name">{{ name }}</span>
    <span class="count">{{ data.count }} Klicks</span>
    <span class="value">({{ euroBetrag }} €)</span>
    <span class="time" v-if="data.lastClickedAt">
      Letzter Klick: {{ formatDate(data.lastClickedAt) }}
    </span>
    <button class="increment" @click="$emit('increment', name)">+1</button>
    <button class="delete" @click="$emit('delete', name)">🗑️</button>
  </div>
</template>

<script setup>
import {computed} from 'vue';

const props = defineProps({
  name: String,
  data: Object,
  valuePerClick: Number
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

<style scoped>
.entry {
  display: flex;
  flex-direction: column;
  background: #fff;
  margin-bottom: 10px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #eee;
}

.name {
  font-weight: bold;
}

.count, .value, .time {
  margin-top: 4px;
}

.increment, .delete {
  margin-top: 6px;
  padding: 6px 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.increment {
  background-color: #3cb371;
  color: white;
}

.delete {
  background-color: #e74c3c;
  color: white;
}
</style>
