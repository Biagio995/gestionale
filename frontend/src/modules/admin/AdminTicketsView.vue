<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import { usePolling } from '@/composables/usePolling';
import { useAdminStore } from '@/stores/admin';
import { useAuthStore } from '@/stores/auth';
import type { TicketStatus } from '@/types';
import { extractApiError } from '@/services/api';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const admin = useAdminStore();
const auth = useAuthStore();

const replyBody = ref('');
const errorKey = ref<string | null>(null);
const statusFilter = ref<TicketStatus | ''>('');
const unreadOnly = ref(false);

const isDetail = computed(() => route.name === 'admin-ticket-detail');
const ticketId = computed(() => route.params.id as string | undefined);

onMounted(() => {
  void loadPageData();
});

watch(
  () => [route.name, route.params.id] as const,
  () => {
    void loadPageData();
  },
);

async function loadPageData(silent = false): Promise<void> {
  if (!silent) errorKey.value = null;
  if (isDetail.value && ticketId.value) {
    try {
      await admin.loadTicket(ticketId.value, { silent });
    } catch (err) {
      if (!silent) errorKey.value = extractApiError(err).messageKey;
    }
  } else {
    if (!silent) admin.currentTicket = null;
    await admin.loadTickets(undefined, { silent });
    if (!silent) await admin.refreshUnreadCount();
  }
}

async function pollPageData(): Promise<void> {
  try {
    await loadPageData(true);
  } catch {
    /* background refresh */
  }
}

usePolling(pollPageData, { intervalMs: 10_000 });

async function applyFilters(): Promise<void> {
  await admin.loadTickets({
    status: statusFilter.value || undefined,
    unreadOnly: unreadOnly.value || undefined,
  });
}

async function sendReply(): Promise<void> {
  if (!ticketId.value || !replyBody.value.trim()) return;
  errorKey.value = null;
  try {
    await admin.reply(ticketId.value, replyBody.value);
    replyBody.value = '';
    await admin.loadTicket(ticketId.value);
  } catch (err) {
    errorKey.value = extractApiError(err).messageKey;
  }
}

async function changeStatus(status: TicketStatus): Promise<void> {
  if (!ticketId.value) return;
  await admin.setTicketStatus(ticketId.value, status);
}

async function assignToMe(): Promise<void> {
  if (!ticketId.value || !auth.user?.id) return;
  await admin.assignToMe(ticketId.value, auth.user.id);
}
</script>

<template>
  <AppLayout>
    <main class="page">
      <template v-if="!isDetail">
        <div class="page-header">
          <h1>{{ t('nav.supportInbox') }}</h1>
        </div>

        <div class="filters">
          <label>
            <span>{{ t('tickets.status') }}</span>
            <select v-model="statusFilter" @change="applyFilters">
              <option value="">{{ t('tickets.allStatuses') }}</option>
              <option value="OPEN">{{ t('tickets.statuses.OPEN') }}</option>
              <option value="IN_PROGRESS">{{ t('tickets.statuses.IN_PROGRESS') }}</option>
              <option value="WAITING">{{ t('tickets.statuses.WAITING') }}</option>
              <option value="CLOSED">{{ t('tickets.statuses.CLOSED') }}</option>
            </select>
          </label>
          <label class="checkbox-label">
            <input v-model="unreadOnly" type="checkbox" @change="applyFilters" />
            {{ t('tickets.unreadOnly') }}
          </label>
        </div>

        <div v-if="admin.loading" class="empty-state">{{ t('app.loading') }}</div>

        <div v-else-if="!admin.tickets.length" class="empty-state">{{ t('tickets.empty') }}</div>

        <div v-else class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ t('admin.company') }}</th>
              <th>{{ t('tickets.contactEmail') }}</th>
              <th>{{ t('tickets.subject') }}</th>
              <th>{{ t('tickets.priority') }}</th>
              <th>{{ t('tickets.status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ticket in admin.tickets"
              :key="ticket.id"
              :class="['clickable', { unread: ticket.unread_by_staff }]"
              @click="router.push({ name: 'admin-ticket-detail', params: { id: ticket.id } })"
            >
              <td>
                <span v-if="ticket.unread_by_staff" class="unread-dot" />
                {{ ticket.ticket_number }}
              </td>
              <td>{{ ticket.tenant_name }}</td>
              <td>{{ ticket.contact_email }}</td>
              <td>{{ ticket.subject }}</td>
              <td>
                <span :class="`badge badge-${ticket.priority.toLowerCase()}`">
                  {{ t(`tickets.priorities.${ticket.priority}`) }}
                </span>
              </td>
              <td>
                <span :class="`badge badge-${ticket.status.toLowerCase()}`">
                  {{ t(`tickets.statuses.${ticket.status}`) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </template>

      <template v-else-if="isDetail && admin.loading">
        <div class="empty-state">{{ t('app.loading') }}</div>
      </template>

      <template v-else-if="admin.currentTicket">
        <div class="page-header">
          <div>
            <button type="button" class="btn btn-ghost btn-sm" @click="router.push('/admin/tickets')">
              ← {{ t('tickets.back') }}
            </button>
            <h1 style="margin-top:0.5rem">
              #{{ admin.currentTicket.ticket.ticket_number }} — {{ admin.currentTicket.ticket.subject }}
            </h1>
            <p class="meta">
              {{ t('admin.company') }}: <strong>{{ admin.currentTicket.ticket.tenant_name }}</strong>
              · {{ t('tickets.contactEmail') }}: <strong>{{ admin.currentTicket.ticket.contact_email }}</strong>
            </p>
          </div>
          <div class="header-actions">
            <button type="button" class="btn btn-ghost btn-sm" @click="assignToMe">
              {{ t('tickets.assignToMe') }}
            </button>
            <select
              :value="admin.currentTicket.ticket.status"
              @change="changeStatus(($event.target as HTMLSelectElement).value as TicketStatus)"
            >
              <option value="OPEN">{{ t('tickets.statuses.OPEN') }}</option>
              <option value="IN_PROGRESS">{{ t('tickets.statuses.IN_PROGRESS') }}</option>
              <option value="WAITING">{{ t('tickets.statuses.WAITING') }}</option>
              <option value="CLOSED">{{ t('tickets.statuses.CLOSED') }}</option>
            </select>
          </div>
        </div>

        <p v-if="errorKey" class="error-text">{{ t(errorKey) }}</p>

        <div class="message-thread">
          <div
            v-for="msg in admin.currentTicket.messages"
            :key="msg.id"
            :class="['message', msg.is_staff ? 'message-staff' : 'message-client']"
          >
            <div class="message-meta">
              {{ msg.author_email }}
              <span v-if="msg.is_staff"> · {{ t('tickets.staff') }}</span>
            </div>
            <div>{{ msg.body }}</div>
          </div>
        </div>

        <form class="form-card" @submit.prevent="sendReply">
          <label>
            <span>{{ t('tickets.replyAsStaff') }}</span>
            <textarea v-model="replyBody" rows="3" required />
          </label>
          <button type="submit" class="btn btn-primary">{{ t('tickets.sendReply') }}</button>
        </form>
      </template>

      <template v-else-if="isDetail">
        <div class="page-header">
          <button type="button" class="btn btn-ghost btn-sm" @click="router.push('/admin/tickets')">
            ← {{ t('tickets.back') }}
          </button>
        </div>
        <p v-if="errorKey" class="error-text">{{ t(errorKey) }}</p>
        <div v-else class="empty-state">{{ t('errors.ticketNotFound') }}</div>
      </template>
    </main>
  </AppLayout>
</template>

<style scoped>
.meta {
  color: var(--text-muted);
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.filters {
  display: flex;
  gap: 1.5rem;
  align-items: flex-end;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filters label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.filters select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
}

.checkbox-label {
  flex-direction: row !important;
  align-items: center;
  gap: 0.5rem !important;
  padding-bottom: 0.5rem;
}

tr.unread {
  font-weight: 600;
}

.unread-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  margin-right: 0.375rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
</style>
