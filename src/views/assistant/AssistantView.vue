<script setup>
import { onMounted } from 'vue';
import { useAssistantChat } from '@/composables/useAssistantChat';

const suggestions = [
    'Wie viel schulde ich aktuell ueber alle Boards?',
    'Welches Board hat aktuell die meisten Klicks?',
    'Welche drei naechsten Schritte verbessern meine Phrasenschwein-Nutzung?',
    'Gib mir eine kurze Zusammenfassung meiner aktuellen Lage.'
];

const { inputText, sending, messages, chatListRef, canSend, init, submitMessage, clearConversation, formatTime } = useAssistantChat();

onMounted(() => {
    void init();
});
</script>

<template>
    <div class="apple-scene p-2">
        <section class="apple-hero apple-reveal">
            <div class="min-w-0">
                <p class="apple-hero__eyebrow">PhrasenAgent</p>
                <h1 class="apple-hero__title">Fragen, Planung und Insights</h1>
                <p class="apple-hero__subtitle">Der Agent nutzt auf Wunsch deine Phrasenschwein-Daten und hilft bei Entscheidungen und naechsten Schritten.</p>
                <div class="apple-quick-stats">
                    <span class="apple-stat-pill">Kontext: persoenliche Boards</span>
                    <span class="apple-stat-pill">Antworten in Echtzeit</span>
                </div>
            </div>
            <div class="apple-hero__actions">
                <Button
                    icon="pi pi-trash"
                    label="Verlauf leeren"
                    severity="secondary"
                    size="small"
                    class="apple-pill p-button-sm"
                    :disabled="sending"
                    @click="clearConversation"
                />
            </div>
        </section>

        <Panel header="Chat" class="apple-panel mt-3">
            <div ref="chatListRef" class="apple-chat-list">
                <div v-for="message in messages" :key="message.id" class="apple-chat-row" :class="message.role === 'user' ? 'apple-chat-row--user' : 'apple-chat-row--assistant'">
                    <div class="apple-chat-bubble" :class="message.role === 'user' ? 'apple-chat-bubble--user' : 'apple-chat-bubble--assistant'">
                        <p class="whitespace-pre-wrap break-words text-sm">{{ message.text }}</p>
                        <div class="mt-2 flex items-center justify-between gap-2 text-xs text-color-secondary">
                            <span>{{ message.role === 'user' ? 'Du' : 'PhrasenAgent' }}</span>
                            <span>{{ formatTime(message.createdAt) }}</span>
                        </div>
                        <div v-if="message.meta" class="mt-2 text-xs text-color-secondary">
                            Kontext: {{ message.meta.pigCount }} Boards, {{ message.meta.totalClicks }} Klicks, {{ message.meta.totalAmount }} EUR
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
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

            <div class="mt-3">
                <Textarea
                    v-model="inputText"
                    rows="3"
                    autoResize
                    class="w-full"
                    placeholder="Stelle eine Frage..."
                    :disabled="sending"
                    @keydown.enter.exact.prevent="submitMessage()"
                />
                <div class="mt-2 flex items-center justify-between gap-2">
                    <small class="text-color-secondary">Enter sendet, Shift+Enter macht Zeilenumbruch.</small>
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
        </Panel>
    </div>
</template>
