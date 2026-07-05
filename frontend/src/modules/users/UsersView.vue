<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/components/AppLayout.vue';
import PendingInvitationsSection from '@/components/PendingInvitationsSection.vue';
import { useAuthStore } from '@/stores/auth';
import { useUsersStore } from '@/stores/users';
import type { TenantRole } from '@/types';
import { extractApiError } from '@/services/api';

const { t } = useI18n();
const auth = useAuthStore();
const users = useUsersStore();

const showInvite = ref(false);
const actionError = ref<string | null>(null);
const inviteSuccess = ref(false);

const inviteForm = reactive({
  email: '',
  role: 'USER' as TenantRole,
});

onMounted(async () => {
  await users.loadUsers();
});

function openInvite(): void {
  inviteForm.email = '';
  inviteForm.role = 'USER';
  showInvite.value = true;
  inviteSuccess.value = false;
  actionError.value = null;
}

async function onInvite(): Promise<void> {
  actionError.value = null;
  inviteSuccess.value = false;
  try {
    await users.invite({ ...inviteForm });
    showInvite.value = false;
    inviteSuccess.value = true;
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  }
}

async function onRoleChange(userId: string, role: TenantRole): Promise<void> {
  actionError.value = null;
  try {
    await users.changeRole(userId, role);
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  }
}

async function onCancelInvitation(id: string): Promise<void> {
  actionError.value = null;
  try {
    await users.cancelInvitation(id);
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  }
}

async function onDeactivate(userId: string, email: string): Promise<void> {
  if (!window.confirm(t('users.deactivateConfirm', { email }))) return;
  actionError.value = null;
  try {
    await users.deactivateUser(userId);
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  }
}
</script>

<template>
  <AppLayout>
    <main class="page">
      <div class="header">
        <h1>{{ t('users.title') }}</h1>
        <button type="button" class="btn btn-primary" @click="openInvite">
          {{ t('users.invite') }}
        </button>
      </div>

      <p v-if="actionError" class="error">{{ t(actionError) }}</p>
      <p v-if="inviteSuccess" class="success">{{ t('users.inviteSent') }}</p>

      <form v-if="showInvite" class="invite-form" @submit.prevent="onInvite">
        <h2>{{ t('users.inviteTitle') }}</h2>
        <p class="hint">{{ t('users.inviteHint') }}</p>

        <label>
          <span>{{ t('auth.email') }}</span>
          <input v-model="inviteForm.email" type="email" required />
        </label>

        <label>
          <span>{{ t('users.role') }}</span>
          <select v-model="inviteForm.role">
            <option value="USER">{{ t('users.roles.USER') }}</option>
            <option value="ADMIN">{{ t('users.roles.ADMIN') }}</option>
          </select>
        </label>

        <div class="actions">
          <button type="button" class="btn btn-ghost" @click="showInvite = false">
            {{ t('items.cancel') }}
          </button>
          <button type="submit" class="btn btn-primary">
            {{ t('users.sendInvite') }}
          </button>
        </div>
      </form>

      <div v-if="users.loading" class="empty">{{ t('app.loading') }}</div>

      <template v-else>
        <PendingInvitationsSection
          :invitations="users.pendingInvitations"
          :cancel-invite="onCancelInvitation"
        />

        <h2 v-if="users.pendingInvitations.length" class="section-title">
          {{ t('users.activeMembers') }}
        </h2>

        <div class="table-scroll">
        <table class="users-table">
          <thead>
            <tr>
              <th>{{ t('auth.email') }}</th>
              <th>{{ t('users.role') }}</th>
              <th>{{ t('users.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in users.users" :key="member.id">
              <td>
                {{ member.email }}
                <span v-if="member.id === auth.user?.id" class="badge">{{ t('users.you') }}</span>
              </td>
              <td>{{ t(`users.roles.${member.role}`) }}</td>
            <td>
              <select
                v-if="member.id !== auth.user?.id && member.role !== 'SUPER_ADMIN'"
                :value="member.role"
                @change="onRoleChange(member.id, ($event.target as HTMLSelectElement).value as TenantRole)"
              >
                <option value="USER">{{ t('users.roles.USER') }}</option>
                <option value="ADMIN">{{ t('users.roles.ADMIN') }}</option>
              </select>
              <span v-else class="muted">—</span>
              <button
                v-if="member.id !== auth.user?.id && member.role !== 'SUPER_ADMIN'"
                type="button"
                class="btn btn-ghost btn-sm btn-danger"
                @click="onDeactivate(member.id, member.email)"
              >
                {{ t('users.deactivate') }}
              </button>
            </td>
            </tr>
          </tbody>
        </table>
        </div>
      </template>
    </main>
  </AppLayout>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.error {
  color: var(--danger);
  margin-bottom: 1rem;
}

.success {
  color: var(--success, #16a34a);
  margin-bottom: 1rem;
}

.hint {
  color: var(--text-muted);
  font-size: 0.875rem;
  margin: 0;
}

.invite-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.875rem;
}

input,
select {
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
}

.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.empty {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted);
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

th,
td {
  padding: 0.875rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  background: var(--bg);
}

.badge {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  color: var(--primary);
}

.muted {
  color: var(--text-muted);
}

.section-title {
  font-size: 1.125rem;
  margin-bottom: 1rem;
}

.btn-danger {
  color: var(--danger);
  margin-left: 0.5rem;
}
</style>
