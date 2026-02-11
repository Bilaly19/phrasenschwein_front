<template>
  <div class="container" v-if="isAuthenticated">
    <h1 class="main-title">BandY's Phrasenschwein 🐷</h1>

    <p class="welcome">
      Eingeloggt als: {{ username }}
      <button @click="handleLogout" :disabled="loading.logout">🚪 Logout</button>
    </p>

    <p class="error" v-if="errorMessage">{{ errorMessage }}</p>
    <p class="info" v-if="infoMessage">{{ infoMessage }}</p>

    <ClickValueInput v-model="valuePerClick" :disabled="loading.saveConfig" />
    <AddNameForm @add="addName" :disabled="loading.add || loading.fetchNames" />

    <button @click="resetAll" class="reset-button" :disabled="loading.reset || loading.fetchNames">
      🔄 Alle Zähler zurücksetzen
    </button>

    <div class="entries">
      <NameEntry
        v-for="(entry, name) in names"
        :key="name"
        :name="name"
        :data="entry"
        :valuePerClick="safeValuePerClick"
        :disabledIncrement="isNamePending(name)"
        :disabledDelete="isNamePending(name)"
        @increment="increment"
        @delete="deleteName"
      />
    </div>
  </div>

  <div v-else>
    <LoginForm v-if="showLogin" @login-success="onLogin" @switch="showLogin = false" />
    <RegisterForm v-else @switch="showLogin = true" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import NameEntry from './components/NameEntry.vue';
import AddNameForm from './components/AddNameForm.vue';
import ClickValueInput from './components/ClickValueInput.vue';
import LoginForm from './components/LoginForm.vue';
import RegisterForm from './components/RegisterForm.vue';
import { apiClient, getErrorMessage } from './api/client';
import { useAuth } from './stores/auth';

const { username, isAuthenticated, logout } = useAuth();

const names = ref({});
const valuePerClick = ref(0.5);
const showLogin = ref(true);
const errorMessage = ref('');
const infoMessage = ref('');
const isInitializingConfig = ref(false);
const pendingNames = ref(new Set());

const loading = reactive({
  fetchNames: false,
  saveConfig: false,
  add: false,
  reset: false,
  logout: false
});

let saveTimer = null;

const safeValuePerClick = computed(() => (Number.isFinite(valuePerClick.value) ? valuePerClick.value : 0));

const clearMessages = () => {
  errorMessage.value = '';
  infoMessage.value = '';
};

const isNamePending = (name) => pendingNames.value.has(name);

const setNamePending = (name, active) => {
  const next = new Set(pendingNames.value);
  if (active) {
    next.add(name);
  } else {
    next.delete(name);
  }
  pendingNames.value = next;
};

const fetchNames = async () => {
  loading.fetchNames = true;
  try {
    const res = await apiClient.get('/api/names');
    names.value = res.data;
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Namen konnten nicht geladen werden.');
  } finally {
    loading.fetchNames = false;
  }
};

const loadConfig = async () => {
  loading.saveConfig = true;
  isInitializingConfig.value = true;
  try {
    const res = await apiClient.get('/api/config');
    const nextValue = Number.parseFloat(res.data?.valuePerClick);
    valuePerClick.value = Number.isFinite(nextValue) ? nextValue : 0.5;
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Konfiguration konnte nicht geladen werden.');
  } finally {
    loading.saveConfig = false;
    isInitializingConfig.value = false;
  }
};

const saveConfig = async (val) => {
  if (!Number.isFinite(val)) return;

  loading.saveConfig = true;
  try {
    await apiClient.post('/api/config', { valuePerClick: val });
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Konfiguration konnte nicht gespeichert werden.');
  } finally {
    loading.saveConfig = false;
  }
};

const addName = async (name) => {
  clearMessages();
  loading.add = true;
  try {
    await apiClient.post('/api/add', { name });
    await fetchNames();
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Name konnte nicht hinzugefügt werden.');
  } finally {
    loading.add = false;
  }
};

const increment = async (name) => {
  clearMessages();
  setNamePending(name, true);
  try {
    await apiClient.post(`/api/increment/${encodeURIComponent(name)}`);
    await fetchNames();
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Zähler konnte nicht erhöht werden.');
  } finally {
    setNamePending(name, false);
  }
};

const deleteName = async (name) => {
  if (!window.confirm(`"${name}" wirklich löschen?`)) return;

  clearMessages();
  setNamePending(name, true);
  try {
    await apiClient.delete(`/api/delete/${encodeURIComponent(name)}`);
    await fetchNames();
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Name konnte nicht gelöscht werden.');
  } finally {
    setNamePending(name, false);
  }
};

const resetAll = async () => {
  if (!window.confirm('Wirklich alle Zähler zurücksetzen?')) return;

  clearMessages();
  loading.reset = true;
  try {
    await apiClient.post('/api/reset');
    await fetchNames();
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Zähler konnten nicht zurückgesetzt werden.');
  } finally {
    loading.reset = false;
  }
};

const handleLogout = async () => {
  clearMessages();
  loading.logout = true;
  try {
    await apiClient.post('/api/logout');
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Logout konnte nicht vollständig abgeschlossen werden.');
  } finally {
    logout();
    names.value = {};
    loading.logout = false;
  }
};

const onLogin = async () => {
  showLogin.value = true;
  clearMessages();
  await Promise.all([fetchNames(), loadConfig()]);
};

const onUnauthorized = (event) => {
  names.value = {};
  showLogin.value = true;
  infoMessage.value = event.detail || 'Bitte erneut einloggen.';
};

onMounted(async () => {
  window.addEventListener('auth:unauthorized', onUnauthorized);

  if (isAuthenticated.value) {
    await Promise.all([fetchNames(), loadConfig()]);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('auth:unauthorized', onUnauthorized);
  if (saveTimer) window.clearTimeout(saveTimer);
});

watch(valuePerClick, (nextVal) => {
  if (isInitializingConfig.value) return;

  if (saveTimer) {
    window.clearTimeout(saveTimer);
  }

  saveTimer = window.setTimeout(() => {
    if (!Number.isFinite(nextVal)) {
      errorMessage.value = 'Bitte einen gültigen Zahlenwert für "Wert pro Klick" eingeben.';
      return;
    }

    saveConfig(nextVal);
  }, 500);
});
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
.reset-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.welcome {
  margin-bottom: 20px;
}
.error {
  color: #d32f2f;
  margin: 8px 0;
}
.info {
  color: #1565c0;
  margin: 8px 0;
}
</style>
