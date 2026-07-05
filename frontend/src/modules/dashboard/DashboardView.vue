<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/components/AppLayout.vue';
import OnboardingChecklist from '@/components/OnboardingChecklist.vue';
import { usePolling } from '@/composables/usePolling';
import { useAuthStore } from '@/stores/auth';
import * as crmService from '@/services/crmService';
import * as fiscalService from '@/services/fiscalService';
import type { CrmStats, DealStage, FiscalDashboardStats } from '@/types';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const auth = useAuthStore();
const router = useRouter();
const stats = ref<CrmStats | null>(null);
const salesStats = ref<FiscalDashboardStats | null>(null);
const ready = ref(false);
const onboardingRef = ref<InstanceType<typeof OnboardingChecklist> | null>(null);

const pipelineStages: DealStage[] = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'];

async function loadDashboard(silent = false): Promise<void> {
  if (!silent) ready.value = false;
  try {
    const [crm, sales] = await Promise.all([
      crmService.fetchCrmStats(),
      fiscalService.fetchFiscalDashboard(),
    ]);
    stats.value = crm;
    salesStats.value = sales;
  } finally {
    ready.value = true;
  }
}

onMounted(() => {
  void loadDashboard();
});

async function pollDashboard(): Promise<void> {
  try {
    await loadDashboard(true);
    await onboardingRef.value?.reload();
  } catch {
    /* background refresh */
  }
}

usePolling(pollDashboard, { intervalMs: 15_000 });

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(value);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

const isEmpty = () =>
  ready.value &&
  stats.value &&
  stats.value.contacts === 0 &&
  stats.value.openDeals === 0;
</script>

<template>
  <AppLayout>
    <main class="page">
      <div class="page-header">
        <div>
          <h1>{{ t('dashboard.crmTitle') }}</h1>
          <p v-if="auth.user" class="welcome">{{ t('dashboard.welcome', { email: auth.user.email }) }}</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-primary" @click="router.push('/crm/contacts')">
            {{ t('crm.contacts.create') }}
          </button>
          <button type="button" class="btn btn-secondary" @click="router.push('/crm/deals')">
            {{ t('crm.deals.create') }}
          </button>
        </div>
      </div>

      <OnboardingChecklist ref="onboardingRef" />

      <div class="stats-grid">
        <div class="stat-card">
          <div class="label">{{ t('crm.stats.contacts') }}</div>
          <div class="value">{{ ready ? stats?.contacts ?? 0 : '—' }}</div>
        </div>
        <div class="stat-card">
          <div class="label">{{ t('crm.stats.leads') }}</div>
          <div class="value">{{ ready ? stats?.leads ?? 0 : '—' }}</div>
        </div>
        <div class="stat-card">
          <div class="label">{{ t('crm.stats.openDeals') }}</div>
          <div class="value">{{ ready ? stats?.openDeals ?? 0 : '—' }}</div>
        </div>
        <div class="stat-card highlight">
          <div class="label">{{ t('crm.stats.pipeline') }}</div>
          <div class="value">{{ ready ? formatCurrency(stats?.pipelineValue ?? 0) : '—' }}</div>
        </div>
        <div class="stat-card success">
          <div class="label">{{ t('crm.stats.won') }}</div>
          <div class="value">{{ ready ? formatCurrency(stats?.wonValue ?? 0) : '—' }}</div>
        </div>
      </div>

      <div v-if="ready && salesStats" class="stats-grid sales-stats">
        <div class="stat-card">
          <div class="label">{{ t('sales.dashboard.invoices') }}</div>
          <div class="value">{{ salesStats.invoices }}</div>
        </div>
        <div class="stat-card">
          <div class="label">{{ t('sales.dashboard.pipeline') }}</div>
          <div class="value">{{ formatCurrency(salesStats.pipelineTotal) }}</div>
        </div>
        <div class="stat-card warn">
          <div class="label">{{ t('sales.dashboard.overdue') }}</div>
          <div class="value">{{ salesStats.overdueInvoices }}</div>
        </div>
        <div class="stat-card">
          <div class="label">{{ t('fiscal.passive.title') }}</div>
          <div class="value">{{ salesStats.unpaidPassive }}</div>
        </div>
        <button type="button" class="btn btn-ghost link-btn" @click="router.push('/sales/scadenzario')">
          {{ t('fiscal.scadenzario.title') }} →
        </button>
      </div>

      <div v-if="ready && stats" class="dashboard-grid">
        <div class="card pipeline-summary">
          <h2>{{ t('crm.deals.pipeline') }}</h2>
          <div class="stage-bars">
            <div v-for="stage in pipelineStages" :key="stage" class="stage-row">
              <span class="stage-label">{{ t(`crm.deals.stages.${stage}`) }}</span>
              <div class="bar-track">
                <div
                  class="bar-fill"
                  :style="{
                    width: stats.openDeals
                      ? `${(stats.dealsByStage[stage] / stats.openDeals) * 100}%`
                      : '0%',
                  }"
                />
              </div>
              <span class="stage-count">{{ stats.dealsByStage[stage] }}</span>
            </div>
          </div>
          <button type="button" class="btn btn-ghost link-btn" @click="router.push('/crm/deals')">
            {{ t('crm.viewPipeline') }} →
          </button>
        </div>

        <div class="card recent-activities">
          <h2>{{ t('crm.activities.recent') }}</h2>
          <div v-if="!stats.recentActivities.length" class="mini-empty">
            {{ t('crm.activities.empty') }}
          </div>
          <ul v-else>
            <li v-for="act in stats.recentActivities" :key="act.id">
              <span class="act-type">{{ t(`crm.activities.types.${act.activity_type}`) }}</span>
              <strong>{{ act.subject }}</strong>
              <span class="act-date">{{ formatDate(act.created_at) }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div v-if="isEmpty()" class="card onboarding">
        <h2>{{ t('onboarding.crmTitle') }}</h2>
        <p>{{ t('onboarding.crmSubtitle') }}</p>
        <div class="onboarding-actions">
          <button type="button" class="btn btn-primary" @click="router.push('/crm/contacts')">
            {{ t('onboarding.addContact') }}
          </button>
          <button type="button" class="btn btn-secondary" @click="router.push('/crm/deals')">
            {{ t('onboarding.createDeal') }}
          </button>
          <button
            v-if="auth.isAdmin"
            type="button"
            class="btn btn-secondary"
            @click="router.push('/users')"
          >
            {{ t('onboarding.inviteUsers') }}
          </button>
        </div>
      </div>
    </main>
  </AppLayout>
</template>

<style scoped>
.welcome {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.stat-card.highlight .value {
  color: var(--primary);
}

.stat-card.success .value {
  color: var(--success);
}

.stat-card.warn .value {
  color: var(--warning, #c2410c);
}

.sales-stats {
  margin-top: 0.5rem;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

.pipeline-summary h2,
.recent-activities h2 {
  font-size: 1rem;
  margin-bottom: 1rem;
}

.stage-bars {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  margin-bottom: 1rem;
}

.stage-row {
  display: grid;
  grid-template-columns: 100px 1fr 32px;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.stage-label {
  color: var(--text-muted);
}

.bar-track {
  height: 8px;
  background: var(--bg);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 4px;
  min-width: 2px;
}

.stage-count {
  text-align: right;
  font-weight: 600;
}

.link-btn {
  padding-left: 0;
}

.recent-activities ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.recent-activities li {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem 0.75rem;
  align-items: baseline;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.act-type {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
}

.act-date {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-left: auto;
}

.mini-empty {
  color: var(--text-muted);
}

.onboarding h2 {
  margin-bottom: 0.5rem;
}

.onboarding p {
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.onboarding-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
