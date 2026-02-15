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

<template>
    <div class="p-fluid flex flex-col gap-2">
        <label for="clickValue" class="text-sm font-medium">Wert pro Klick (EUR)</label>
        <InputNumber
            id="clickValue"
            :modelValue="displayValue"
            :disabled="disabled"
            :minFractionDigits="2"
            :maxFractionDigits="2"
            :useGrouping="false"
            placeholder="z. B. 0.50"
            inputClass="w-full p-inputtext-sm"
            class="w-full"
            @update:modelValue="onInput"
        />
    </div>
</template>
