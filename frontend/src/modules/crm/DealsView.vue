<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/components/AppLayout.vue';
import DealForm from './DealForm.vue';
import * as crmService from '@/services/crmService';
import { extractApiError } from '@/services/api';
import type { CrmContact, CrmDeal, DealPayload, DealStage } from '@/types';

const { t } = useI18n();

const PIPELINE_STAGES: DealStage[] = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'];
const CLOSED_STAGES: DealStage[] = ['WON', 'LOST'];

const deals = ref<CrmDeal[]>([]);
const contacts = ref<CrmContact[]>([]);
const loading = ref(true);
const showForm = ref(false);
const showClosed = ref(false);
const actionError = ref<string | null>(null);

const openDeals = computed(() =>
  deals.value.filter((d) => PIPELINE_STAGES.includes(d.stage)),
);

const closedDeals = computed(() =>
  deals.value.filter((d) => CLOSED_STAGES.includes(d.stage)),
);

const dealsByStage = computed(() => {
  const map: Record<DealStage, CrmDeal[]> = {
    LEAD: [],
    QUALIFIED: [],
    PROPOSAL: [],
    NEGOTIATION: [],
    WON: [],
    LOST: [],
  };
  for (const deal of openDeals.value) {
    map[deal.stage].push(deal);
  }
  return map;
});

onMounted(load);

async function load(): Promise<void> {
  loading.value = true;
  actionError.value = null;
  try {
    [deals.value, contacts.value] = await Promise.all([
      crmService.fetchDeals(),
      crmService.fetchContacts(),
    ]);
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    loading.value = false;
  }
}

async function onCreateDeal(payload: DealPayload): Promise<void> {
  actionError.value = null;
  try {
    await crmService.createDeal(payload);
    showForm.value = false;
    await load();
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  }
}

async function changeStage(deal: CrmDeal, stage: DealStage): Promise<void> {
  if (deal.stage === stage) return;
  actionError.value = null;
  try {
    await crmService.updateDeal(deal.id, { stage });
    await load();
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  }
}

async function onDelete(deal: CrmDeal): Promise<void> {
  if (!confirm(t('crm.deals.confirmDelete'))) return;
  actionError.value = null;
  try {
    await crmService.deleteDeal(deal.id);
    await load();
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  }
}

function formatCurrency(value: string, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
    parseFloat(value),
  );
}

function stageTotal(stage: DealStage): number {
  return dealsByStage.value[stage].reduce((sum, d) => sum + parseFloat(d.value), 0);
}
</script>

<template>
  <AppLayout>
    <main class="page page-wide">
      <div class="page-header">
        <h1>{{ t('crm.deals.pipeline') }}</h1>
        <button type="button" class="btn btn-primary" @click="showForm = !showForm">
          {{ t('crm.deals.create') }}
        </button>
      </div>

      <p v-if="actionError" class="error">{{ t(actionError) }}</p>

      <DealForm
        v-if="showForm"
        :contacts="contacts"
        @save="onCreateDeal"
        @cancel="showForm = false"
      />

      <div v-if="loading" class="empty">{{ t('app.loading') }}</div>

      <div v-else class="pipeline">
        <div v-for="stage in PIPELINE_STAGES" :key="stage" class="pipeline-col">
          <div class="col-header">
            <h2>{{ t(`crm.deals.stages.${stage}`) }}</h2>
            <span class="col-meta">
              {{ dealsByStage[stage].length }} · {{ formatCurrency(String(stageTotal(stage)), 'EUR') }}
            </span>
          </div>
          <div class="col-body">
            <div v-for="deal in dealsByStage[stage]" :key="deal.id" class="deal-card card">
              <div class="deal-title">{{ deal.title }}</div>
              <div class="deal-value">{{ formatCurrency(deal.value, deal.currency) }}</div>
              <div v-if="deal.contact_name || deal.company_name" class="deal-contact">
                {{ deal.contact_name }}
                <span v-if="deal.company_name"> · {{ deal.company_name }}</span>
              </div>
              <div class="deal-actions">
                <select :value="deal.stage" @change="changeStage(deal, ($event.target as HTMLSelectElement).value as DealStage)">
                  <option v-for="s in [...PIPELINE_STAGES, ...CLOSED_STAGES]" :key="s" :value="s">
                    {{ t(`crm.deals.stages.${s}`) }}
                  </option>
                </select>
                <button type="button" class="btn btn-ghost btn-sm" @click="onDelete(deal)">
                  {{ t('crm.delete') }}
                </button>
              </div>
            </div>
            <div v-if="!dealsByStage[stage].length" class="col-empty">—</div>
          </div>
        </div>
      </div>

      <div v-if="closedDeals.length" class="closed-section">
        <button type="button" class="btn btn-ghost toggle-closed" @click="showClosed = !showClosed">
          {{ t('crm.deals.closedSection') }} ({{ closedDeals.length }})
        </button>
        <div v-if="showClosed" class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('crm.deals.title') }}</th>
              <th>{{ t('crm.deals.contact') }}</th>
              <th>{{ t('crm.deals.value') }}</th>
              <th>{{ t('crm.deals.stage') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="deal in closedDeals" :key="deal.id">
              <td>{{ deal.title }}</td>
              <td>{{ deal.contact_name || '—' }}</td>
              <td>{{ formatCurrency(deal.value, deal.currency) }}</td>
              <td>{{ t(`crm.deals.stages.${deal.stage}`) }}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </main>
  </AppLayout>
</template>

<style scoped>
.page-wide {
  max-width: 1400px;
}

.error {
  color: var(--danger);
  margin-bottom: 1rem;
}

.empty {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted);
}

.pipeline {
  display: grid;
  grid-template-columns: repeat(4, minmax(220px, 1fr));
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 1rem;
}

.pipeline-col {
  min-width: 220px;
  background: var(--bg);
  border-radius: 12px;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.col-header {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--border);
}

.col-header h2 {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.col-meta {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.col-body {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  min-height: 120px;
}

.col-empty {
  color: var(--text-muted);
  font-size: 0.85rem;
  text-align: center;
  padding: 1rem;
}

.deal-card {
  padding: 0.875rem;
  border: 1px solid var(--border);
}

.deal-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.deal-value {
  color: var(--primary);
  font-weight: 700;
  margin-bottom: 0.375rem;
}

.deal-contact {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.deal-actions {
  display: flex;
  gap: 0.375rem;
  align-items: center;
}

.deal-actions select {
  flex: 1;
  font-size: 0.75rem;
  padding: 0.25rem 0.375rem;
  border: 1px solid var(--border);
  border-radius: 6px;
}

.btn-sm {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.closed-section {
  margin-top: 2rem;
}

.toggle-closed {
  margin-bottom: 0.75rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

th,
td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

th {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-muted);
  background: var(--bg);
}
</style>
