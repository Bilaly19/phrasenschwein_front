<template>
  <Card class="auth-card">
    <template #title>
      <p class="text-xs uppercase tracking-[0.2em] text-primary">Neues Konto</p>
      <h2 class="mt-1 text-lg font-semibold">Registrieren</h2>
    </template>
    <template #subtitle>
      <p class="text-xs opacity-80">Lege dein Profil an und starte direkt los.</p>
    </template>
    <template #content>
      <div class="space-y-2">
        <InputText
          v-model="username"
          placeholder="Benutzername"
          :disabled="isSubmitting"
          class="w-full max-w-[300px]"
          @keyup.enter="register"
        />
        <p class="text-xs opacity-70">3-40 Zeichen, erlaubt sind a-z, A-Z, 0-9 sowie ., _, -.</p>
        <small class="text-red-300" v-if="fieldErrors.username">{{ fieldErrors.username }}</small>

        <InputText
          v-model="password"
          type="password"
          placeholder="Passwort"
          :disabled="isSubmitting"
          class="w-full max-w-[300px]"
          @keyup.enter="register"
        />
        <p class="text-xs opacity-70">8-200 Zeichen.</p>
        <small class="text-red-300" v-if="fieldErrors.password">{{ fieldErrors.password }}</small>
      </div>

      <Button
        @click="register"
        :disabled="isSubmitting"
        :label="isSubmitting ? 'Bitte warten...' : 'Konto erstellen'"
        icon="pi pi-user-plus"
        size="small"
        class="mt-2.5 w-full max-w-[300px] !px-2.5 !py-1 text-xs"
      />

      <Message v-if="message" severity="success" class="mt-3">{{ message }}</Message>
      <Message v-if="error" severity="error" class="mt-3">{{ error }}</Message>

      <p class="mt-2.5 text-xs opacity-80">
        Schon registriert?
        <a href="#" class="font-semibold text-primary transition hover:opacity-90" @click.prevent="$emit('switch')">
          Einloggen
        </a>
      </p>
    </template>
  </Card>
</template>

<script setup>
import { ref } from 'vue';
import { authApi, getErrorMessage } from '@/api';

defineEmits(['switch']);
const username = ref('');
const password = ref('');
const message = ref('');
const error = ref('');
const isSubmitting = ref(false);
const fieldErrors = ref({
  username: '',
  password: ''
});
const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;

const resetErrors = () => {
  error.value = '';
  fieldErrors.value = { username: '', password: '' };
};

const hasFieldErrors = (errors) => Boolean(errors.username || errors.password);

const validateRegisterInput = (payload) => {
  const nextFieldErrors = { username: '', password: '' };

  if (typeof payload.username !== 'string' || payload.username.length < 3 || payload.username.length > 40) {
    nextFieldErrors.username = 'Benutzername muss 3-40 Zeichen lang sein.';
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
  if (path === 'username') return message.replace(/^username\b/i, 'Benutzername');
  if (path === 'password') return message.replace(/^password\b/i, 'Passwort');
  return message;
};

const mapBackendValidationErrors = (apiError) => {
  const nextFieldErrors = { username: '', password: '' };

  if (apiError?.code === 'USER_EXISTS') {
    nextFieldErrors.username = 'Benutzername existiert bereits.';
    return nextFieldErrors;
  }

  const details = Array.isArray(apiError?.details) ? apiError.details : [];
  for (const detail of details) {
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
  message.value = '';
  resetErrors();

  const payload = {
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
    await authApi.register(payload);

    message.value = 'Registrierung erfolgreich! Du kannst dich jetzt einloggen.';
  } catch (e) {
    const serverFieldErrors = mapBackendValidationErrors(e);
    if (hasFieldErrors(serverFieldErrors)) {
      fieldErrors.value = serverFieldErrors;
      if (e?.code === 'USER_EXISTS') {
        error.value = 'Bitte waehle einen anderen Benutzernamen.';
      } else if (e?.code === 'VALIDATION_ERROR' || Array.isArray(e?.details)) {
        error.value = 'Bitte korrigiere die markierten Felder.';
      } else {
        error.value = getErrorMessage(e, 'Registrierung fehlgeschlagen.');
      }
      return;
    }

    error.value = getErrorMessage(e, 'Registrierung fehlgeschlagen.');
  } finally {
    isSubmitting.value = false;
  }
};
</script>
