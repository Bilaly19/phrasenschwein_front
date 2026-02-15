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

<template>
    <div class="p-fluid flex flex-col gap-2 sm:flex-row sm:items-center">
        <InputText v-model="localName" placeholder="Name eingeben" :disabled="disabled" class="w-full p-inputtext-sm" @keyup.enter="submit" />
        <Button @click="submit" :disabled="disabled" label="Hinzufuegen" icon="pi pi-plus" severity="primary" size="small" class="p-button-sm" />
    </div>
</template>
