import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AcceptInvitationPayload, Language, LoginPayload, RegisterPayload, User } from '@/types';
import * as authService from '@/services/authService';
import {
  clearStoredToken,
  extractApiError,
  getStoredToken,
  setStoredToken,
  setUnauthorizedHandler,
} from '@/services/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(getStoredToken());
  const loading = ref(false);
  const errorKey = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(
    () => user.value?.role === 'ADMIN' || user.value?.role === 'SUPER_ADMIN',
  );
  const isSuperAdmin = computed(() => user.value?.role === 'SUPER_ADMIN');

  function setSession(newToken: string, newUser: User): void {
    token.value = newToken;
    user.value = newUser;
    setStoredToken(newToken);
  }

  function clearSession(): void {
    token.value = null;
    user.value = null;
    clearStoredToken();
  }

  async function login(payload: LoginPayload): Promise<void> {
    loading.value = true;
    errorKey.value = null;
    try {
      const result = await authService.login(payload);
      setSession(result.token, result.user);
    } catch (err) {
      errorKey.value = extractApiError(err).messageKey;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function register(payload: RegisterPayload): Promise<void> {
    loading.value = true;
    errorKey.value = null;
    try {
      const result = await authService.register(payload);
      setSession(result.token, result.user);
    } catch (err) {
      errorKey.value = extractApiError(err).messageKey;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function acceptInvitation(payload: AcceptInvitationPayload): Promise<void> {
    loading.value = true;
    errorKey.value = null;
    try {
      const result = await authService.acceptInvitation(payload);
      setSession(result.token, result.user);
    } catch (err) {
      errorKey.value = extractApiError(err).messageKey;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMe(): Promise<void> {
    if (!token.value) return;
    loading.value = true;
    errorKey.value = null;
    try {
      user.value = await authService.fetchMe();
    } catch (err) {
      clearSession();
      errorKey.value = extractApiError(err).messageKey;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function changeLanguage(language: Language): Promise<void> {
    if (!user.value) return;
    const updated = await authService.updateLanguage(language);
    user.value = updated;
  }

  function logout(): void {
    clearSession();
    errorKey.value = null;
  }

  setUnauthorizedHandler(() => {
    clearSession();
  });

  return {
    user,
    token,
    loading,
    errorKey,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    login,
    register,
    acceptInvitation,
    fetchMe,
    changeLanguage,
    logout,
    clearSession,
  };
});
