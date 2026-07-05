import { api } from './api';
import type {
  AcceptInvitationPayload,
  AuthResponse,
  InvitationPreview,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  User,
} from '@/types';

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', payload);
  return data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}

export async function updateLanguage(language: string): Promise<User> {
  const { data } = await api.patch<User>('/users/me/language', { language });
  return data;
}

export async function fetchInvitationPreview(token: string): Promise<InvitationPreview> {
  const { data } = await api.get<InvitationPreview>(`/auth/invitations/${token}`);
  return data;
}

export async function acceptInvitation(payload: AcceptInvitationPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/accept-invitation', payload);
  return data;
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  await api.post('/auth/reset-password', payload);
}
