<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import { usePolling } from '@/composables/usePolling';
import { useAdminStore } from '@/stores/admin';

const { t } = useI18n();
const router = useRouter();
const admin = useAdminStore();

async function loadDashboard(silent = false): Promise<void> {
  await Promise.all([
    admin.loadStats(),
    admin.loadTickets(undefined, { silent }),
  ]);
}

onMounted(() => {
  void loadDashboard();
});

async function pollDashboard(): Promise<void> {
  try {
    await loadDashboard(true);
  } catch {
    /* background refresh */
  }
}

usePolling(pollDashboard, { intervalMs: 10_000 });
</script>

<template>
  <AppLayout>
    <main class="page">
      <div class="page-header">
        <div>
          <h1>{{ t('admin.dashboardTitle') }}</h1>
          <p class="subtitle">{{ t('admin.dashboardSubtitle') }}</p>
        </div>
        <button type="button" class="btn btn-primary" @click="router.push('/admin/companies')">
          {{ t('admin.newCompany') }}
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="label">{{ t('admin.stats.companies') }}</div>
          <div class="value">{{ admin.stats?.companies ?? '—' }}</div>
        </div>
        <div class="stat-card">
          <div class="label">{{ t('admin.stats.activeCompanies') }}</div>
          <div class="value">{{ admin.stats?.activeCompanies ?? '—' }}</div>
        </div>
        <div class="stat-card">
          <div class="label">{{ t('admin.stats.openTickets') }}</div>
          <div class="value">{{ admin.stats?.openTickets ?? '—' }}</div>
        </div>
        <div class="stat-card">
          <div class="label">{{ t('admin.stats.unreadTickets') }}</div>
          <div class="value">{{ admin.stats?.unreadTickets ?? '—' }}</div>
        </div>
        <div
          class="stat-card stat-card-clickable"
          role="button"
          tabindex="0"
          @click="router.push({ path: '/admin/contracts', query: { expiring: '1' } })"
          @keydown.enter="router.push({ path: '/admin/contracts', query: { expiring: '1' } })"
        >
          <div class="label">{{ t('admin.stats.expiringContracts') }}</div>
          <div class="value">{{ admin.stats?.expiringContracts ?? '—' }}</div>
        </div>
      </div>

      <div class="card">
        <h2 style="margin-bottom:1rem">{{ t('admin.recentTickets') }}</h2>
        <div v-if="!admin.tickets.length" class="empty-state">{{ t('tickets.empty') }}</div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ t('admin.company') }}</th>
              <th>{{ t('tickets.contactEmail') }}</th>
              <th>{{ t('tickets.subject') }}</th>
              <th>{{ t('tickets.status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ticket in admin.tickets.slice(0, 5)"
              :key="ticket.id"
              class="clickable"
              @click="router.push({ name: 'admin-ticket-detail', params: { id: ticket.id } })"
            >
              <td>{{ ticket.ticket_number }}</td>
              <td>{{ ticket.tenant_name }}</td>
              <td>{{ ticket.contact_email }}</td>
              <td>{{ ticket.subject }}</td>
              <td>
                <span :class="`badge badge-${ticket.status.toLowerCase()}`">
                  {{ t(`tickets.statuses.${ticket.status}`) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </AppLayout>
</template>

<style scoped>
.subtitle {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.stat-card-clickable {
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
}

.stat-card-clickable:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}
</style>
