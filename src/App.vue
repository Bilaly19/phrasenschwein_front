<template>
  <div class="container" v-if="isAuthenticated">
    <h1 class="main-title">BandY's Phrasenschwein 🐷</h1>

    <p class="welcome">Eingeloggt als: {{ username }} <button @click="logout">🚪 Logout</button></p>

    <ClickValueInput v-model="valuePerClick" />
    <AddNameForm @add="addName" />

    <button @click="resetAll" class="reset-button">
      🔄 Alle Zähler zurücksetzen
    </button>

    <div class="entries">
      <NameEntry
          v-for="(entry, name) in names"
          :key="name"
          :name="name"
          :data="entry"
          :valuePerClick="valuePerClick"
          @increment="increment"
          @delete="deleteName"
      />
    </div>
  </div>

  <!-- Login/Register Ansicht -->
  <div v-else>
    <LoginForm v-if="showLogin" @login-success="onLogin" @switch="showLogin = false" />
    <RegisterForm v-else @switch="showLogin = true" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';

import NameEntry from './components/NameEntry.vue';
import AddNameForm from './components/AddNameForm.vue';
import ClickValueInput from './components/ClickValueInput.vue';
import LoginForm from './components/LoginForm.vue';
import RegisterForm from './components/RegisterForm.vue';

const names = ref({});
const valuePerClick = ref(0.5);
const username = ref(localStorage.getItem('username'));
const showLogin = ref(true);
const isAuthenticated = ref(!!localStorage.getItem('token'));

// Axios mit Token vorbereiten
axios.defaults.baseURL = import.meta.env.VITE_API_URL;
axios.defaults.withCredentials = true;
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = token;
  return config;
});

const fetchNames = async () => {
  const res = await axios.get('http://localhost:3000/api/names');
  names.value = res.data;
};

const loadConfig = async () => {
  const res = await axios.get('http://localhost:3000/api/config');
  valuePerClick.value = res.data.valuePerClick;
};

const saveConfig = async (val) => {
  await axios.post('http://localhost:3000/api/config', { valuePerClick: val });
};

const addName = async (name) => {
  await axios.post('http://localhost:3000/api/add', { name });
  await fetchNames();
};

const increment = async (name) => {
  await axios.post(`http://localhost:3000/api/increment/${name}`);
  await fetchNames();
};

const deleteName = async (name) => {
  await axios.delete(`http://localhost:3000/api/delete/${name}`);
  await fetchNames();
};

const resetAll = async () => {
  await axios.post('http://localhost:3000/api/reset');
  await fetchNames();
};

const logout = async () => {
  await axios.post('http://localhost:3000/api/logout');
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  isAuthenticated.value = false;
  username.value = null;
};

const onLogin = (loggedInUser) => {
  isAuthenticated.value = true;
  username.value = loggedInUser;
  showLogin.value = true;
  fetchNames();
  loadConfig();
};

onMounted(() => {
  if (isAuthenticated.value) {
    fetchNames();
    loadConfig();
  }
});

watch(valuePerClick, saveConfig);
</script>

<style scoped>
.main-title {
  font-size: 28px;
  margin-bottom: 10px;
  color: #333;
}

.container {
  max-width: 500px;
  margin: 40px auto;
  padding: 20px;
  background: #fafafa;
  border-radius: 12px;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.1);
  font-family: sans-serif;
  text-align: center;
}
.entries {
  margin-top: 25px;
}
.reset-button {
  margin-top: 20px;
  padding: 8px 16px;
  background-color: #888;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.reset-button:hover {
  background-color: #555;
}
.welcome {
  margin-bottom: 20px;
}
</style>
