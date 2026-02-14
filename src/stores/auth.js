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
    username.value = nextUsername || null;
    persistAuth();
  };

  const clearAuthState = () => {
    token.value = null;
    username.value = null;
    persistAuth();
  };

  return {
    token,
    username,
    isAuthenticated,
    login,
    logout: clearAuthState,
    clearAuthState
  };
};

export const getAuthToken = () => token.value;
