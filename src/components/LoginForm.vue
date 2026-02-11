<template>
  <div class="auth-container">
    <div class="auth-card">
      <p class="eyebrow">Willkommen zurück</p>
      <h2>🔐 Login</h2>
      <p class="subtitle">Melde dich an und füttere das Phrasenschwein.</p>

      <input v-model="localUsername" placeholder="Benutzername" :disabled="isSubmitting" />
      <input v-model="password" type="password" placeholder="Passwort" :disabled="isSubmitting" />

      <button @click="login" :disabled="isSubmitting">{{ isSubmitting ? 'Bitte warten…' : 'Einloggen' }}</button>
      <p class="error" v-if="error">{{ error }}</p>

      <p class="switch">
        Noch kein Konto? <a href="#" @click.prevent="$emit('switch')">Registrieren</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { apiClient, getErrorMessage } from '../api/client';
import { useAuth } from '../stores/auth';

const emit = defineEmits(['login-success', 'switch']);
const localUsername = ref('');
const password = ref('');
const error = ref('');
const isSubmitting = ref(false);
const { login: loginAuth } = useAuth();

const login = async () => {
  error.value = '';

  if (!localUsername.value.trim() || !password.value.trim()) {
    error.value = 'Bitte Benutzername und Passwort eingeben.';
    return;
  }

  isSubmitting.value = true;
  try {
    const res = await apiClient.post('/api/login', {
      username: localUsername.value,
      password: password.value
    });

    loginAuth(res.data.token, res.data.username);
    emit('login-success');
  } catch (e) {
    error.value = getErrorMessage(e, 'Login fehlgeschlagen.');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.auth-container {
  min-height: calc(100vh - 4rem);
  display: grid;
  place-items: center;
}

.auth-card {
  width: min(420px, 100%);
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 18px;
  padding: 1.6rem;
  box-shadow: 0 18px 40px rgba(31, 41, 55, 0.14);
  text-align: left;
  backdrop-filter: blur(6px);
}

.eyebrow {
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4caf50;
  margin-bottom: 0.2rem;
  font-weight: 700;
}

h2 {
  margin: 0;
  color: #1f2937;
}

.subtitle {
  margin: 0.25rem 0 1rem;
  color: #6b7280;
}

input {
  width: 100%;
  padding: 0.7rem 0.8rem;
  margin: 0.4rem 0;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  background-color: #fff;
}

input:focus {
  outline: 2px solid rgba(76, 175, 80, 0.25);
  border-color: #4caf50;
}

button {
  width: 100%;
  padding: 0.75rem;
  margin-top: 0.55rem;
  background: linear-gradient(135deg, #4caf50, #43a047);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}

button:hover {
  filter: brightness(1.03);
}

button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.error {
  margin-top: 0.65rem;
  color: #d32f2f;
}

.switch {
  margin-top: 1rem;
  font-size: 0.92rem;
  color: #4b5563;
}

.switch a {
  color: #2e7d32;
  font-weight: 700;
}
</style>
