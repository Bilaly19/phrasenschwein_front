<template>
  <div class="login-container">
    <div class="login-box">
      <h2>🔐 Login</h2>
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
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}
button:hover {
  background-color: #43a047;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  color: #4caf50;
  font-weight: bold;
  cursor: pointer;
}
</style>
