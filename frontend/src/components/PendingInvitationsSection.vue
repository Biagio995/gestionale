<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PendingInvitation } from '@/types';

const props = defineProps<{
  invitations: PendingInvitation[];
  cancelInvite: (id: string) => Promise<void>;
}>();

const { t, locale } = useI18n();
const cancellingId = ref<string | null>(null);

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

async function onCancel(invite: PendingInvitation): Promise<void> {
  const confirmed = window.confirm(
    t('users.cancelInviteConfirm', { email: invite.email }),
  );
  if (!confirmed) return;

  cancellingId.value = invite.id;
  try {
    await props.cancelInvite(invite.id);
  } finally {
    cancellingId.value = null;
  }
}
</script>

<template>
  <section v-if="invitations.length" class="pending-section">
    <h2>{{ t('users.pendingTitle') }}</h2>
    <p class="hint">{{ t('users.pendingHint') }}</p>

    <table class="users-table">
      <thead>
        <tr>
          <th>{{ t('auth.email') }}</th>
          <th>{{ t('users.role') }}</th>
          <th>{{ t('users.invitedAt') }}</th>
          <th>{{ t('users.expiresAt') }}</th>
          <th>{{ t('users.status') }}</th>
          <th>{{ t('users.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="invite in invitations" :key="invite.id">
          <td>{{ invite.email }}</td>
          <td>{{ t(`users.roles.${invite.role}`) }}</td>
          <td>{{ formatDate(invite.created_at) }}</td>
          <td>{{ formatDate(invite.expires_at) }}</td>
          <td>
            <span class="status-badge">{{ t('users.pendingStatus') }}</span>
          </td>
          <td>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-danger"
              :disabled="cancellingId === invite.id"
              @click="onCancel(invite)"
            >
              {{ t('users.cancelInvite') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.pending-section {
  margin-bottom: 2rem;
}

.pending-section h2 {
  font-size: 1.125rem;
  margin-bottom: 0.25rem;
}

.hint {
  color: var(--text-muted);
  font-size: 0.875rem;
  margin: 0 0 1rem;
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

.status-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  color: var(--primary);
}

.btn-danger {
  color: var(--danger);
}

.btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--danger) 10%, transparent);
}
</style>
