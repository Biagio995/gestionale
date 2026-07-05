import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { InviteResult, InviteUserPayload, PendingInvitation, TenantRole, User } from '@/types';
import * as usersService from '@/services/usersService';
import { extractApiError } from '@/services/api';

export const useUsersStore = defineStore('users', () => {
  const users = ref<User[]>([]);
  const pendingInvitations = ref<PendingInvitation[]>([]);
  const loading = ref(false);
  const errorKey = ref<string | null>(null);
  const lastInvite = ref<InviteResult | null>(null);

  async function loadUsers(): Promise<void> {
    loading.value = true;
    errorKey.value = null;
    try {
      const [usersList, pending] = await Promise.all([
        usersService.fetchUsers(),
        usersService.fetchPendingInvitations(),
      ]);
      users.value = usersList;
      pendingInvitations.value = pending;
    } catch (err) {
      errorKey.value = extractApiError(err).messageKey;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function invite(payload: InviteUserPayload): Promise<InviteResult> {
    const result = await usersService.inviteUser(payload);
    lastInvite.value = result;
    pendingInvitations.value = await usersService.fetchPendingInvitations();
    return result;
  }

  async function changeRole(userId: string, role: TenantRole): Promise<void> {
    const updated = await usersService.updateUserRole(userId, role);
    const index = users.value.findIndex((u) => u.id === userId);
    if (index !== -1) {
      users.value[index] = updated;
    }
  }

  async function cancelInvitation(invitationId: string): Promise<void> {
    await usersService.cancelInvitation(invitationId);
    pendingInvitations.value = pendingInvitations.value.filter((i) => i.id !== invitationId);
  }

  async function deactivateUser(userId: string): Promise<void> {
    await usersService.deactivateUser(userId);
    users.value = users.value.filter((u) => u.id !== userId);
  }

  return {
    users,
    pendingInvitations,
    loading,
    errorKey,
    lastInvite,
    loadUsers,
    invite,
    cancelInvitation,
    deactivateUser,
    changeRole,
  };
});
