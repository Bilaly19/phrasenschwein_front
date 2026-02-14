<template>
  <Card class="auth-card">
    <template #title>
      <p class="text-xs uppercase tracking-[0.2em] text-primary">Willkommen</p>
      <h2 class="mt-1 text-lg font-semibold">Login</h2>
    </template>
    <template #subtitle>
      <p class="text-xs opacity-80">Melde dich an und fuettere das Phrasenschwein.</p>
    </template>
    <template #content>
      <div class="space-y-2">
        <InputText
          v-model="localUsername"
          placeholder="Benutzername"
          :disabled="isSubmitting"
          class="w-full max-w-[300px]"
          @keyup.enter="login"
        />
        <InputText
          v-model="password"
          type="password"
          placeholder="Passwort"
          :disabled="isSubmitting"
          class="w-full max-w-[300px]"
          @keyup.enter="login"
        />
      </div>
      <Button
        @click="login"
        :disabled="isSubmitting"
        :label="isSubmitting ? 'Bitte warten...' : 'Einloggen'"
        icon="pi pi-sign-in"
        size="small"
        class="mt-2.5 w-full max-w-[300px] !px-2.5 !py-1 text-xs"
      />
      <Message v-if="error" severity="error" class="mt-3">{{ error }}</Message>
      <p class="mt-2.5 text-xs opacity-80">
        Noch kein Konto?
        <a href="#" class="font-semibold text-primary transition hover:opacity-90" @click.prevent="$emit('switch')">
          Registrieren
        </a>
      </p>
    </template>
  </Card>
</template>

<script setup>
import { ref } from 'vue';
import { authApi, getErrorMessage } from '@/api';
import { useAuth } from '@/stores/auth';

const emit = defineEmits(['login-success', 'switch']);
const localUsername = ref('');
const password = ref('');
const error = ref('');
const isSubmitting = ref(false);
const { login: loginAuth, clearAuthState } = useAuth();
const authDebug = (...args) => {
  if (import.meta.env.DEV) {
    console.debug(...args);
  }
};

const login = async () => {
  error.value = '';

  if (!localUsername.value.trim() || !password.value.trim()) {
    error.value = 'Bitte Benutzername und Passwort eingeben.';
    return;
  }

  isSubmitting.value = true;
  try {
    const normalizedUsername = localUsername.value.trim();
    const res = await authApi.login({
      username: normalizedUsername,
      password: password.value
    });

    loginAuth(res.token, res.username);
    emit('login-success');
  } catch (e) {
    clearAuthState();
    authDebug('[auth] login error status/code:', e?.status ?? 'n/a', e?.code ?? 'n/a');
    if (e?.status === 401 && e?.code === 'LOGIN_FAILED') {
      error.value = 'Benutzername oder Passwort ist falsch.';
    } else {
      error.value = getErrorMessage(e, 'Login fehlgeschlagen.');
    }
  } finally {
    isSubmitting.value = false;
  }
};
</script>
