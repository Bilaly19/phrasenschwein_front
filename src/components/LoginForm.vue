<template>
  <div class="login-container">
    <div class="login-box">
      <h2>🔐 Login</h2>
      <input v-model="username" placeholder="Benutzername" />
      <input v-model="password" type="password" placeholder="Passwort" />
      <button @click="login">Einloggen</button>
      <p class="error" v-if="error">{{ error }}</p>
      <p class="switch">
        Noch kein Konto? <a href="#" @click.prevent="$emit('switch')">Registrieren</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const emit = defineEmits(['login-success', 'switch']);
const username = ref('');
const password = ref('');
const error = ref('');

const login = async () => {
  try {
    const res = await axios.post('http://localhost:3000/api/login', {
      username: username.value,
      password: password.value
    });

    localStorage.setItem('token', res.data.token);
    localStorage.setItem('username', res.data.username);
    emit('login-success', res.data.username);
  } catch (e) {
    console.error(e);
    error.value = 'Login fehlgeschlagen';
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
