import { api } from './api';
import type { InviteResult, InviteUserPayload, OnboardingStatus, PendingInvitation, TenantRole, User } from '@/types';

export async function fetchUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>('/users');
  return data;
}

export async function fetchPendingInvitations(): Promise<PendingInvitation[]> {
  const { data } = await api.get<PendingInvitation[]>('/users/invitations');
  return data;
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  await api.delete(`/users/invitations/${invitationId}`);
}

export async function deactivateUser(userId: string): Promise<void> {
  await api.delete(`/users/${userId}`);
}

export async function inviteUser(payload: InviteUserPayload): Promise<InviteResult> {
  const { data } = await api.post<InviteResult>('/users/invite', payload);
  return data;
}

export async function updateUserRole(userId: string, role: TenantRole): Promise<User> {
  const { data } = await api.patch<User>(`/users/${userId}/role`, { role });
  return data;
}

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const { data } = await api.get<OnboardingStatus>('/users/me/onboarding');
  return data;
}

export async function dismissOnboarding(): Promise<OnboardingStatus> {
  const { data } = await api.post<OnboardingStatus>('/users/me/onboarding/dismiss');
  return data;
}
