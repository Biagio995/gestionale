<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import { usePolling } from '@/composables/usePolling';
import { useAuthStore } from '@/stores/auth';
import { useTicketsStore } from '@/stores/tickets';
import type { TicketStatus } from '@/types';
import { extractApiError } from '@/services/api';

const { t } = useI18n();
const route = useRoute();
const auth = useAuthStore();
const tickets = useTicketsStore();

const replyBody = ref('');
const errorKey = ref<string | null>(null);

const ticketId = computed(() => route.params.id as string);

onMounted(() => {
  void tickets.loadTicket(ticketId.value);
});

watch(ticketId, (id) => {
  void tickets.loadTicket(id);
});

async function pollTicket(): Promise<void> {
  try {
    await tickets.loadTicket(ticketId.value, { silent: true });
  } catch {
    /* background refresh */
  }
}

usePolling(pollTicket, { intervalMs: 10_000 });

async function sendReply(): Promise<void> {
  if (!replyBody.value.trim()) return;
  errorKey.value = null;
  try {
    await tickets.reply(ticketId.value, replyBody.value);
    replyBody.value = '';
    await tickets.loadTicket(ticketId.value);
  } catch (err) {
    errorKey.value = extractApiError(err).messageKey;
  }
}

async function changeStatus(status: TicketStatus): Promise<void> {
  errorKey.value = null;
  try {
    await tickets.setStatus(ticketId.value, status);
  } catch (err) {
    errorKey.value = extractApiError(err).messageKey;
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString();
}
</script>

<template>
  <AppLayout>
    <main class="page">
      <div v-if="tickets.loading" class="empty-state">{{ t('app.loading') }}</div>

      <template v-else-if="tickets.current">
        <div class="page-header">
          <div>
            <h1>#{{ tickets.current.ticket.ticket_number }} — {{ tickets.current.ticket.subject }}</h1>
            <p class="meta">
              <span :class="`badge badge-${tickets.current.ticket.status.toLowerCase()}`">
                {{ t(`tickets.statuses.${tickets.current.ticket.status}`) }}
              </span>
              <span :class="`badge badge-${tickets.current.ticket.priority.toLowerCase()}`">
                {{ t(`tickets.priorities.${tickets.current.ticket.priority}`) }}
              </span>
              <span class="contact">{{ t('tickets.contactEmail') }}: {{ tickets.current.ticket.contact_email }}</span>
            </p>
          </div>
          <div v-if="auth.isAdmin" class="status-actions">
            <select
              :value="tickets.current.ticket.status"
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
            v-for="msg in tickets.current.messages"
            :key="msg.id"
            :class="['message', msg.is_staff ? 'message-staff' : 'message-client']"
          >
            <div class="message-meta">
              {{ msg.author_email }}
              <span v-if="msg.is_staff"> · {{ t('tickets.staff') }}</span>
              · {{ formatDate(msg.created_at) }}
            </div>
            <div>{{ msg.body }}</div>
          </div>
        </div>

        <form v-if="tickets.current.ticket.status !== 'CLOSED'" class="form-card" @submit.prevent="sendReply">
          <label>
            <span>{{ t('tickets.reply') }}</span>
            <textarea v-model="replyBody" rows="3" required />
          </label>
          <button type="submit" class="btn btn-primary">{{ t('tickets.sendReply') }}</button>
        </form>
      </template>
    </main>
  </AppLayout>
</template>

<style scoped>
.meta {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.contact {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.status-actions select {
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--border);
}
</style>
