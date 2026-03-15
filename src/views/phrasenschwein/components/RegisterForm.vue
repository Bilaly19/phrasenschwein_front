<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { authApi, getErrorMessage } from '@/api';

const emit = defineEmits(['switch', 'register-success']);
const toast = useToast();
const firstName = ref('');
const lastName = ref('');
const username = ref('');
const password = ref('');
const error = ref('');
const isSubmitting = ref(false);
const fieldErrors = ref({
    firstName: '',
    lastName: '',
    username: '',
    password: ''
});
const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const asObject = (value) => (value && typeof value === 'object' ? value : {});
const extractToken = (payload) => {
    const source = asObject(payload);
    return String(source.token || source.accessToken || source.jwt || '').trim();
};

const resetErrors = () => {
    error.value = '';
    fieldErrors.value = { firstName: '', lastName: '', username: '', password: '' };
};

const hasFieldErrors = (errors) => Boolean(errors.firstName || errors.lastName || errors.username || errors.password);

const validateRegisterInput = (payload) => {
    const nextFieldErrors = { firstName: '', lastName: '', username: '', password: '' };

    if (typeof payload.firstName !== 'string' || payload.firstName.length < 1 || payload.firstName.length > 80) {
        nextFieldErrors.firstName = 'Vorname muss 1-80 Zeichen lang sein.';
    }
    if (typeof payload.lastName !== 'string' || payload.lastName.length < 1 || payload.lastName.length > 80) {
        nextFieldErrors.lastName = 'Nachname muss 1-80 Zeichen lang sein.';
    }

    if (typeof payload.username !== 'string' || payload.username.length < 3 || payload.username.length > 24) {
        nextFieldErrors.username = 'Benutzername muss 3-24 Zeichen lang sein.';
    } else if (!USERNAME_REGEX.test(payload.username)) {
        nextFieldErrors.username = 'Benutzername darf nur a-z, A-Z, 0-9, . _ - enthalten.';
    }

    if (typeof payload.password !== 'string' || payload.password.length < 8 || payload.password.length > 200) {
        nextFieldErrors.password = 'Passwort muss 8-200 Zeichen lang sein.';
    }

    return nextFieldErrors;
};

const toReadableValidationMessage = (path, message = '') => {
    if (!message) return '';
    if (path === 'firstName') return message.replace(/^firstName\b/i, 'Vorname');
    if (path === 'lastName') return message.replace(/^lastName\b/i, 'Nachname');
    if (path === 'username') return message.replace(/^username\b/i, 'Benutzername');
    if (path === 'password') return message.replace(/^password\b/i, 'Passwort');
    return message;
};

const mapBackendValidationErrors = (apiError) => {
    const nextFieldErrors = { firstName: '', lastName: '', username: '', password: '' };

    if (apiError?.code === 'USERNAME_TAKEN' || apiError?.code === 'NAME_ALREADY_EXISTS') {
        nextFieldErrors.username = 'Benutzername existiert bereits.';
        return nextFieldErrors;
    }

    const details = Array.isArray(apiError?.details) ? apiError.details : [];
    for (const detail of details) {
        if (detail?.path === 'firstName' && !nextFieldErrors.firstName) {
            nextFieldErrors.firstName = toReadableValidationMessage('firstName', detail?.message);
        }
        if (detail?.path === 'lastName' && !nextFieldErrors.lastName) {
            nextFieldErrors.lastName = toReadableValidationMessage('lastName', detail?.message);
        }
        if (detail?.path === 'username' && !nextFieldErrors.username) {
            nextFieldErrors.username = toReadableValidationMessage('username', detail?.message);
        }
        if (detail?.path === 'password' && !nextFieldErrors.password) {
            nextFieldErrors.password = toReadableValidationMessage('password', detail?.message);
        }
    }

    return nextFieldErrors;
};

const register = async () => {
    resetErrors();

    const payload = {
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
        username: username.value.trim(),
        password: password.value
    };

    const clientFieldErrors = validateRegisterInput(payload);
    if (hasFieldErrors(clientFieldErrors)) {
        fieldErrors.value = clientFieldErrors;
        error.value = 'Bitte korrigiere die markierten Felder.';
        return;
    }

    isSubmitting.value = true;
    try {
        const response = await authApi.register(payload);
        const responseObject = asObject(response);
        const nestedPayload = asObject(responseObject.data);
        const resultPayload = Object.keys(nestedPayload).length ? nestedPayload : responseObject;

        toast.add({ severity: 'success', summary: 'Registrierung', detail: 'Registrierung erfolgreich', life: 2500 });
        emit('register-success', {
            username: payload.username,
            token: extractToken(resultPayload) || extractToken(responseObject) || null,
            roles: resultPayload.roles || resultPayload.role || responseObject.roles || responseObject.role || []
        });
    } catch (e) {
        const serverFieldErrors = mapBackendValidationErrors(e);
        if (hasFieldErrors(serverFieldErrors)) {
            fieldErrors.value = serverFieldErrors;
            if (e?.code === 'USERNAME_TAKEN' || e?.code === 'NAME_ALREADY_EXISTS') {
                error.value = `[${e.code}] Bitte waehle einen anderen Benutzernamen.`;
            } else if (e?.code === 'VALIDATION_ERROR' || Array.isArray(e?.details)) {
                error.value = '[VALIDATION_ERROR] Bitte korrigiere die markierten Felder.';
            } else {
                const baseMessage = getErrorMessage(e, 'Registrierung fehlgeschlagen.');
                error.value = e?.code ? `[${e.code}] ${baseMessage}` : baseMessage;
            }
            toast.add({ severity: 'error', summary: 'Registrierung', detail: error.value, life: 3500 });
            return;
        }

        const baseMessage = getErrorMessage(e, 'Registrierung fehlgeschlagen.');
        error.value = e?.code ? `[${e.code}] ${baseMessage}` : baseMessage;
        toast.add({ severity: 'error', summary: 'Registrierung', detail: error.value, life: 3500 });
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <Card class="auth-card apple-auth-card apple-reveal">
        <template #title>
            <p class="apple-auth-kicker text-xs uppercase tracking-[0.2em] text-primary">Neues Konto</p>
            <h2 class="apple-auth-title mt-1 text-lg font-semibold mb-3">Registrieren</h2>
        </template>
        <template #subtitle>
            <p class="apple-auth-subtitle text-sm opacity-80 mb-3">Lege dein Profil an und starte direkt los.</p>
        </template>
        <template #content>
            <div class="apple-auth-fields p-fluid text-sm flex flex-col gap-2">
                <IconField>
                    <InputIcon class="pi pi-id-card" />
                    <InputText v-model="firstName" placeholder="Vorname" :disabled="isSubmitting" class="w-full p-inputtext-sm" @keyup.enter="register" />
                </IconField>
                <small class="text-red-400" v-if="fieldErrors.firstName">{{ fieldErrors.firstName }}</small>

                <IconField>
                    <InputIcon class="pi pi-id-card" />
                    <InputText v-model="lastName" placeholder="Nachname" :disabled="isSubmitting" class="w-full p-inputtext-sm" @keyup.enter="register" />
                </IconField>
                <small class="text-red-400" v-if="fieldErrors.lastName">{{ fieldErrors.lastName }}</small>

                <IconField>
                    <InputIcon class="pi pi-user-edit" />
                    <InputText v-model="username" placeholder="Benutzername" :disabled="isSubmitting" class="w-full p-inputtext-sm" @keyup.enter="register" />
                </IconField>
                <div class="rounded-border border border-surface-200 px-3 py-2 text-xs text-color-secondary">
                    <p>3-24 Zeichen</p>
                    <p>erlaubt: Buchstaben, Zahlen, Punkt, Unterstrich, Bindestrich</p>
                    <p>Beispiel: bilal.y</p>
                </div>
                <small class="text-red-400" v-if="fieldErrors.username">{{ fieldErrors.username }}</small>

                <IconField>
                    <InputIcon class="pi pi-key" />
                    <Password v-model="password" placeholder="Passwort" :disabled="isSubmitting" :feedback="false" toggleMask inputClass="w-full p-inputtext-sm" class="w-full" @keyup.enter="register" />
                </IconField>
                <p class="text-xs text-color-secondary">8-200 Zeichen.</p>
                <small class="text-red-400" v-if="fieldErrors.password">{{ fieldErrors.password }}</small>
            </div>

            <Button @click="register" :disabled="isSubmitting" :label="isSubmitting ? 'Bitte warten...' : 'Konto erstellen'" icon="pi pi-user-plus" size="small" class="apple-auth-submit mt-3 w-full p-button-sm" />

            <Message v-if="error" severity="error" class="mt-3">{{ error }}</Message>

            <div class="apple-auth-switch mt-3 text-sm text-color-secondary">
                Schon registriert?
                <Button label="Einloggen" link size="small" class="p-0 ml-1 align-baseline" @click="$emit('switch')" />
            </div>
        </template>
    </Card>
</template>
