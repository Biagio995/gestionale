import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types';

const TOKEN_KEY = 'gestionale_token';

export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ??
    (import.meta.env.PROD ? '' : 'http://localhost:3000'),
  headers: { 'Content-Type': 'application/json' },
});

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type LogoutHandler = () => void;
let onUnauthorized: LogoutHandler | null = null;

export function setUnauthorizedHandler(handler: LogoutHandler): void {
  onUnauthorized = handler;
}

export function extractApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    if (axiosError.response?.data?.messageKey) {
      return axiosError.response.data;
    }
    if (!axiosError.response) {
      return { code: 'NETWORK_ERROR', messageKey: 'errors.network' };
    }
  }
  return { code: 'UNKNOWN', messageKey: 'errors.generic' };
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const status = error.response?.status;
    const messageKey = error.response?.data?.messageKey;

    if (
      status === 401 &&
      (messageKey === 'errors.tenantMismatch' ||
        messageKey === 'errors.invalidToken' ||
        messageKey === 'errors.tenantInvalid' ||
        messageKey === 'errors.sessionRevoked' ||
        messageKey === 'errors.userDeactivated' ||
        messageKey === 'errors.unauthorized' ||
        messageKey === 'errors.missingToken')
    ) {
      onUnauthorized?.();
    }

    return Promise.reject(error);
  },
);
