<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useAuth } from '@/stores/auth';
import { useAssistantChat } from '@/composables/useAssistantChat';

const isOpen = ref(false);
const { isAuthenticated } = useAuth();

const suggestions = [
    'Was ist mein Gesamtbetrag?',
    'Welches Board braucht am meisten Aufmerksamkeit?',
    'Gib mir die wichtigsten naechsten Schritte.'
];

const { inputText, sending, messages, chatListRef, canSend, init, scrollToBottom, submitMessage, clearConversation, formatTime } = useAssistantChat();

const chatTitle = computed(() => (sending.value ? 'PhrasenAgent schreibt...' : 'PhrasenAgent'));

const openChat = async () => {
    isOpen.value = true;
    await scrollToBottom();
};

watch(isOpen, (open) => {
    if (!open) return;
    void scrollToBottom();
});

watch(
    () => isAuthenticated.value,
    (authed) => {
        if (!authed) {
            isOpen.value = false;
        }
    }
);

onMounted(() => {
    void init();
});
</script>

<template>
    <div v-if="isAuthenticated" class="phrasen-agent-widget">
        <Button
            icon="pi pi-comments"
            label="PhrasenAgent"
            size="small"
            class="phrasen-agent-trigger apple-pill p-button-sm"
            @click="openChat"
        />

        <Dialog
            v-model:visible="isOpen"
            :header="chatTitle"
            :draggable="false"
            :modal="false"
            :dismissableMask="false"
            :closable="true"
            position="bottomright"
            :style="{ width: 'min(26rem, calc(100vw - 1.2rem))' }"
            :breakpoints="{ '640px': 'calc(100vw - 1rem)' }"
            class="phrasen-agent-dialog"
        >
            <div ref="chatListRef" class="apple-chat-list phrasen-agent-chat">
                <div v-for="message in messages" :key="message.id" class="apple-chat-row" :class="message.role === 'user' ? 'apple-chat-row--user' : 'apple-chat-row--assistant'">
                    <div class="apple-chat-bubble" :class="message.role === 'user' ? 'apple-chat-bubble--user' : 'apple-chat-bubble--assistant'">
                        <p class="whitespace-pre-wrap break-words text-sm">{{ message.text }}</p>
                        <div class="mt-2 flex items-center justify-between gap-2 text-xs text-color-secondary">
                            <span>{{ message.role === 'user' ? 'Du' : 'PhrasenAgent' }}</span>
                            <span>{{ formatTime(message.createdAt) }}</span>
                        </div>
                        <div v-if="message.meta" class="mt-2 text-xs text-color-secondary">
                            {{ message.meta.pigCount }} Boards, {{ message.meta.totalClicks }} Klicks, {{ message.meta.totalAmount }} EUR
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-2 flex flex-wrap gap-2">
                <Button
                    v-for="prompt in suggestions"
                    :key="prompt"
                    size="small"
                    severity="secondary"
                    text
                    class="apple-pill p-button-sm"
                    :disabled="sending"
                    @click="submitMessage(prompt)"
                >
                    {{ prompt }}
                </Button>
            </div>

            <div class="mt-2">
                <Textarea
                    v-model="inputText"
                    rows="3"
                    autoResize
                    class="w-full"
                    placeholder="Frag den PhrasenAgent..."
                    :disabled="sending"
                    @keydown.enter.exact.prevent="submitMessage()"
                />

                <div class="mt-2 flex items-center justify-between gap-2">
                    <Button
                        icon="pi pi-trash"
                        label="Leeren"
                        size="small"
                        severity="secondary"
                        class="apple-pill p-button-sm"
                        :disabled="sending"
                        @click="clearConversation"
                    />
                    <Button
                        icon="pi pi-send"
                        label="Senden"
                        size="small"
                        class="apple-pill p-button-sm"
                        :loading="sending"
                        :disabled="!canSend"
                        @click="submitMessage()"
                    />
                </div>
            </div>
        </Dialog>
    </div>
</template>

<style scoped>
.phrasen-agent-widget {
    position: fixed;
    right: 1.1rem;
    bottom: 1.1rem;
    z-index: 1000;
}

.phrasen-agent-trigger {
    box-shadow: 0 16px 34px rgba(15, 23, 42, 0.22);
}

.phrasen-agent-chat {
    max-height: min(52vh, 26rem);
}

:deep(.phrasen-agent-dialog .p-dialog) {
    border-radius: 18px;
    overflow: hidden;
}

@media (max-width: 640px) {
    .phrasen-agent-widget {
        right: 0.5rem;
        bottom: 0.5rem;
    }
}
</style>
