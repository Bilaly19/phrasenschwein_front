<template>
  <div class="auth-container">
    <div class="auth-card">
      <p class="eyebrow">Neues Konto</p>
      <h2>📝 Registrieren</h2>
      <p class="subtitle">Lege dein Profil an und starte direkt los.</p>

      <input v-model="username" placeholder="Benutzername" :disabled="isSubmitting" />
      <input v-model="password" type="password" placeholder="Passwort" :disabled="isSubmitting" />

      <button @click="register" :disabled="isSubmitting">{{ isSubmitting ? 'Bitte warten…' : 'Konto erstellen' }}</button>
      <p class="message" v-if="message">{{ message }}</p>
      <p class="error" v-if="error">{{ error }}</p>

      <p class="switch">
        Schon registriert? <a href="#" @click.prevent="$emit('switch')">Einloggen</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { apiClient, getErrorMessage } from '../api/client';

defineEmits(['switch']);
const username = ref('');
const password = ref('');
const message = ref('');
const error = ref('');
const isSubmitting = ref(false);

const register = async () => {
  message.value = '';
  error.value = '';

  if (!username.value.trim() || !password.value.trim()) {
    error.value = 'Bitte Benutzername und Passwort eingeben.';
    return;
  }

  isSubmitting.value = true;
  try {
    await apiClient.post('/api/register', {
      username: username.value,
      password: password.value
    });

    message.value = 'Registrierung erfolgreich! Du kannst dich jetzt einloggen.';
  } catch (e) {
    error.value = getErrorMessage(e, 'Registrierung fehlgeschlagen.');
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
  color: #2196f3;
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
  outline: 2px solid rgba(33, 150, 243, 0.2);
  border-color: #2196f3;
}

button {
  width: 100%;
  padding: 0.75rem;
  margin-top: 0.55rem;
  background: linear-gradient(135deg, #2196f3, #1976d2);
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

.message {
  margin-top: 0.65rem;
  color: #2e7d32;
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
  color: #1976d2;
  font-weight: 700;
}
</style>
