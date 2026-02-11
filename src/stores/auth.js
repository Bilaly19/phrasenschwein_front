import { computed, ref } from 'vue';

const token = ref(localStorage.getItem('token'));
const username = ref(localStorage.getItem('username'));

const persistAuth = () => {
  if (token.value) {
    localStorage.setItem('token', token.value);
  } else {
    localStorage.removeItem('token');
  }

  if (username.value) {
    localStorage.setItem('username', username.value);
  } else {
    localStorage.removeItem('username');
  }
};

export const useAuth = () => {
  const isAuthenticated = computed(() => Boolean(token.value));

  const login = (nextToken, nextUsername) => {
    token.value = nextToken;
    username.value = nextUsername;
    persistAuth();
  };

  const logout = () => {
    token.value = null;
    username.value = null;
    persistAuth();
  };

  return {
    token,
    username,
    isAuthenticated,
    login,
    logout
  };
};

export const getAuthToken = () => token.value;
