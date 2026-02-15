<script setup>
import { reactive, ref } from 'vue';

const props = defineProps({
    header: {
        type: String,
        default: null
    },
    code: null,
    recent: {
        type: Boolean,
        default: false
    },
    free: {
        type: Boolean,
        default: false
    },
    containerClass: null,
    previewStyle: null
});

const BlockView = reactive({
    PREVIEW: 0,
    CODE: 1
});
const blockView = ref(0);
const codeCopied = ref(false);
const codeCopyLoading = ref(false);

function activateView(blockViewValue) {
    blockView.value = blockViewValue;
}

async function copyCode() {
    if (codeCopied.value || codeCopyLoading.value) return;

    codeCopyLoading.value = true;

    try {
        await navigator.clipboard.writeText(props.code);
        codeCopyLoading.value = false;
        codeCopied.value = true;
        setTimeout(() => {
            codeCopied.value = false;
        }, 2000);
    } catch (err) {
        console.error('Clipboard write failed:', err);
        codeCopyLoading.value = false;
    }
}
</script>

<template>
    <div class="mb-16 overflow-hidden">
        <div class="flex flex-col lg:flex-row justify-between py-4 gap-4 lg:gap-2 px-0!">
            <div class="flex items-center gap-2">
                <span class="font-medium text-xl">{{ header }}</span>
                <span v-if="free" class="flex items-center justify-center px-1.5 py-1 w-fit bg-emerald-500 text-emerald-100 dark:bg-emerald-400 dark:text-emerald-800 rounded-md leading-none! text-xs md:text-sm">Free</span>
            </div>
            <div class="flex items-center gap-2">
                <!-- Preview/Code Toggle -->
                <div class="inline-flex border border-surface-200 dark:border-surface-700 rounded-2xl overflow-hidden min-h-10">
                    <Button
                        label="Code"
                        size="small"
                        class="p-button-sm !rounded-none !border-0 !min-w-28"
                        :severity="blockView === BlockView.CODE ? 'primary' : 'secondary'"
                        :outlined="blockView !== BlockView.CODE"
                        @click="activateView(BlockView.CODE)"
                    />
                    <Button
                        label="Preview"
                        size="small"
                        class="p-button-sm !rounded-none !border-0 !min-w-28"
                        :severity="blockView === BlockView.PREVIEW ? 'primary' : 'secondary'"
                        :outlined="blockView !== BlockView.PREVIEW"
                        @click="activateView(BlockView.PREVIEW)"
                    />
                </div>

                <!-- Separator -->
                <div class="h-6 w-px bg-surface-200 dark:bg-surface-700 hidden lg:block"></div>

                <!-- Animated Copy Button -->
                <div class="flex items-center gap-2 grow lg:grow-0 justify-end lg:justify-start">
                    <Button @click="copyCode" :disabled="codeCopyLoading" rounded text :loading="codeCopyLoading" :icon="codeCopied ? 'pi pi-check' : 'pi pi-copy'" class="!w-10 !h-10" aria-label="Code kopieren" />
                </div>
            </div>
        </div>
        <div class="p-0 border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
            <div :class="containerClass" :style="previewStyle" v-if="blockView == BlockView.PREVIEW">
                <slot />
            </div>
            <div v-if="blockView === BlockView.CODE">
                <pre class="app-code"><code>{{code}}</code></pre>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
pre {
    border: 0 none !important;
    border-radius: 0 !important;
    .app-code {
        background: var(--p-surface-900) !important;
        margin: 0 !important;
        border: 0 none !important;
        &:before,
        &:after {
            display: none !important;
        }
        code {
            color: var(--p-surface-50);
            padding: 1rem;
            line-height: 1.5;
            display: block;
            font-family: monaco, Consolas, monospace;
        }
    }
}
</style>
