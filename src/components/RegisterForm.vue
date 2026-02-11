<template>
  <div class="login-container">
    <div class="login-box">
      <h2>📝 Registrieren</h2>
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
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #f2f2f2;
}
.login-box {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  width: 300px;
  text-align: center;
}
input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border-radius: 8px;
  border: 1px solid #ccc;
}
button {
  width: 100%;
  padding: 10px;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}
button:hover {
  background-color: #1976d2;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.message {
  margin-top: 10px;
  color: #2e7d32;
}
.error {
  margin-top: 10px;
  color: #d32f2f;
}
.switch {
  margin-top: 15px;
  font-size: 14px;
}
.switch a {
  color: #2196f3;
  font-weight: bold;
  cursor: pointer;
}
</style>
