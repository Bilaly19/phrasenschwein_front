<template>
  <div class="login-container">
    <div class="login-box">
      <h2>📝 Registrieren</h2>
      <input v-model="username" placeholder="Benutzername" />
      <input v-model="password" type="password" placeholder="Passwort" />
      <button @click="register">Konto erstellen</button>
      <p class="message" v-if="message">{{ message }}</p>
      <p class="switch">
        Schon registriert? <a href="#" @click.prevent="$emit('switch')">Einloggen</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const emit = defineEmits(['switch']);
const username = ref('');
const password = ref('');
const message = ref('');

const register = async () => {
  try {
    await axios.post('http://localhost:3000/api/register', {
      username: username.value,
      password: password.value
    });
    message.value = 'Registrierung erfolgreich! Du kannst dich jetzt einloggen.';
  } catch (e) {
    message.value = 'Registrierung fehlgeschlagen. Benutzername evtl. vergeben.';
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

.login-box h2 {
  margin-bottom: 20px;
}

input {
  display: block;
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 14px;
}

button {
  width: 100%;
  padding: 10px;
  background-color: #2196f3;
  color: white;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
}

button:hover {
  background-color: #1976d2;
}

.switch {
  margin-top: 12px;
  font-size: 14px;
}

.switch a {
  color: #2196f3;
  font-weight: bold;
  cursor: pointer;
}

.message {
  margin-top: 10px;
  font-size: 14px;
  color: #388e3c;
}
</style>
