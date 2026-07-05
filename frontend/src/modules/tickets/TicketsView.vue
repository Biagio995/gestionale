<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import { usePolling } from '@/composables/usePolling';
import { useTicketsStore } from '@/stores/tickets';
import type { TicketPriority } from '@/types';
import { extractApiError } from '@/services/api';

const { t } = useI18n();
const router = useRouter();
const tickets = useTicketsStore();

const showForm = ref(false);
const errorKey = ref<string | null>(null);

const form = reactive({
  subject: '',
  description: '',
  priority: 'NORMAL' as TicketPriority,
});

onMounted(() => tickets.loadTickets());

async function pollTickets(): Promise<void> {
  try {
    await tickets.loadTickets({ silent: true });
  } catch {
    /* background refresh */
  }
}

usePolling(pollTickets, { intervalMs: 15_000 });

async function onSubmit(): Promise<void> {
  errorKey.value = null;
  try {
    const created = await tickets.create({ ...form });
    showForm.value = false;
    router.push({ name: 'ticket-detail', params: { id: created.id } });
  } catch (err) {
    errorKey.value = extractApiError(err).messageKey;
  }
}

function statusClass(status: string): string {
  return `badge badge-${status.toLowerCase()}`;
}
</script>

<template>
  <AppLayout>
    <main class="page">
      <div class="page-header">
        <h1>{{ t('tickets.title') }}</h1>
        <button type="button" class="btn btn-primary" @click="showForm = !showForm">
          {{ t('tickets.newTicket') }}
        </button>
      </div>

      <p v-if="errorKey" class="error-text">{{ t(errorKey) }}</p>

      <form v-if="showForm" class="form-card" @submit.prevent="onSubmit">
        <h2>{{ t('tickets.createTitle') }}</h2>
        <label>
          <span>{{ t('tickets.subject') }}</span>
          <input v-model="form.subject" required minlength="3" maxlength="200" />
        </label>
        <label>
          <span>{{ t('tickets.description') }}</span>
          <textarea v-model="form.description" required minlength="10" rows="4" />
        </label>
        <label>
          <span>{{ t('tickets.priority') }}</span>
          <select v-model="form.priority">
            <option value="LOW">{{ t('tickets.priorities.LOW') }}</option>
            <option value="NORMAL">{{ t('tickets.priorities.NORMAL') }}</option>
            <option value="HIGH">{{ t('tickets.priorities.HIGH') }}</option>
            <option value="URGENT">{{ t('tickets.priorities.URGENT') }}</option>
          </select>
        </label>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end">
          <button type="button" class="btn btn-ghost" @click="showForm = false">{{ t('items.cancel') }}</button>
          <button type="submit" class="btn btn-primary">{{ t('tickets.submit') }}</button>
        </div>
      </form>

      <div v-if="tickets.loading" class="empty-state">{{ t('app.loading') }}</div>

      <div v-else-if="!tickets.tickets.length" class="empty-state">
        <p>{{ t('tickets.empty') }}</p>
        <button type="button" class="btn btn-primary" style="margin-top:1rem" @click="showForm = true">
          {{ t('tickets.newTicket') }}
        </button>
      </div>

      <div v-else class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{{ t('tickets.subject') }}</th>
            <th>{{ t('tickets.priority') }}</th>
            <th>{{ t('tickets.status') }}</th>
            <th>{{ t('tickets.date') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="ticket in tickets.tickets"
            :key="ticket.id"
            class="clickable"
            @click="router.push({ name: 'ticket-detail', params: { id: ticket.id } })"
          >
            <td>{{ ticket.ticket_number }}</td>
            <td>{{ ticket.subject }}</td>
            <td><span :class="`badge badge-${ticket.priority.toLowerCase()}`">{{ t(`tickets.priorities.${ticket.priority}`) }}</span></td>
            <td><span :class="statusClass(ticket.status)">{{ t(`tickets.statuses.${ticket.status}`) }}</span></td>
            <td>{{ new Date(ticket.created_at).toLocaleDateString() }}</td>
          </tr>
        </tbody>
      </table>
      </div>
    </main>
  </AppLayout>
</template>
