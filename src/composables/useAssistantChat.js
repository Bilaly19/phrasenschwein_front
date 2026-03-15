import { computed, nextTick, ref, watch } from 'vue';
import { assistantApi, getErrorMessage } from '@/api';
import { useAuth } from '@/stores/auth';
import { useToast } from 'primevue/usetoast';

const DEFAULT_MAX_HISTORY = 12;

const createMessageId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const toHistoryPayload = (message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: String(message.text || '').trim()
});

export const useAssistantChat = ({
    storageKey = 'assistantChatMessages',
    maxHistory = DEFAULT_MAX_HISTORY,
    introMessage = null
} = {}) => {
    const toast = useToast();
    const { username } = useAuth();

    const inputText = ref('');
    const sending = ref(false);
    const messages = ref([]);
    const chatListRef = ref(null);

    const canSend = computed(() => !sending.value && inputText.value.trim().length > 0);

    const defaultIntroMessage = () => introMessage || `Hallo @${username.value || 'du'}! Ich bin PhrasenAgent und helfe dir bei Phrasenschwein, Statistik und naechsten Schritten.`;

    const readStoredMessages = () => {
        if (typeof window === 'undefined') return [];

        try {
            const raw = window.sessionStorage.getItem(storageKey);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];

            return parsed
                .filter((entry) => entry && typeof entry === 'object')
                .map((entry) => ({
                    id: typeof entry.id === 'string' ? entry.id : createMessageId(),
                    role: entry.role === 'assistant' ? 'assistant' : 'user',
                    text: typeof entry.text === 'string' ? entry.text : '',
                    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString(),
                    model: typeof entry.model === 'string' ? entry.model : null,
                    meta: entry.meta && typeof entry.meta === 'object' ? entry.meta : null
                }))
                .filter((entry) => entry.text.trim().length > 0)
                .slice(-maxHistory * 2);
        } catch {
            return [];
        }
    };

    const persistMessages = () => {
        if (typeof window === 'undefined') return;

        try {
            window.sessionStorage.setItem(storageKey, JSON.stringify(messages.value.slice(-maxHistory * 2)));
        } catch {
            // ignore storage errors
        }
    };

    const scrollToBottom = async () => {
        await nextTick();
        const node = chatListRef.value;
        if (!node) return;
        node.scrollTop = node.scrollHeight;
    };

    const addAssistantMessage = (text, extra = {}) => {
        messages.value.push({
            id: createMessageId(),
            role: 'assistant',
            text,
            createdAt: new Date().toISOString(),
            model: extra.model || null,
            meta: extra.meta || null
        });
    };

    const clearConversation = () => {
        messages.value = [];
        addAssistantMessage(defaultIntroMessage());
    };

    const submitMessage = async (prefilledText = null) => {
        const text = String(prefilledText ?? inputText.value).trim();
        if (!text || sending.value) return;

        const historyBefore = messages.value.slice(-maxHistory).map(toHistoryPayload);

        messages.value.push({
            id: createMessageId(),
            role: 'user',
            text,
            createdAt: new Date().toISOString(),
            model: null,
            meta: null
        });

        inputText.value = '';
        sending.value = true;
        await scrollToBottom();

        try {
            const response = await assistantApi.chat({
                message: text,
                history: historyBefore,
                includePortfolio: true
            });

            const reply = String(response?.reply || '').trim() || 'Ich konnte gerade keine sinnvolle Antwort erzeugen.';
            addAssistantMessage(reply, {
                model: response?.model || null,
                meta: response?.portfolio || null
            });
        } catch (error) {
            const message = getErrorMessage(error, 'Nachricht konnte nicht gesendet werden.');
            addAssistantMessage(`Fehler: ${message}`);
            toast.add({ severity: 'error', summary: 'PhrasenAgent', detail: message, life: 3500 });
        } finally {
            sending.value = false;
            await scrollToBottom();
        }
    };

    const formatTime = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    };

    const init = async () => {
        messages.value = readStoredMessages();
        if (!messages.value.length) {
            addAssistantMessage(defaultIntroMessage());
        }
        await scrollToBottom();
    };

    watch(
        () => messages.value,
        () => {
            persistMessages();
        },
        { deep: true }
    );

    return {
        inputText,
        sending,
        messages,
        chatListRef,
        canSend,
        init,
        scrollToBottom,
        submitMessage,
        clearConversation,
        formatTime
    };
};
