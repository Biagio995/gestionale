<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import * as fiscalService from '@/services/fiscalService';
import { extractApiError } from '@/services/api';
import type { ScadenzarioEntry } from '@/types';

const { t } = useI18n();
const router = useRouter();

const entries = ref<ScadenzarioEntry[]>([]);
const loading = ref(true);
const actionError = ref<string | null>(null);

onMounted(load);

async function load(): Promise<void> {
  loading.value = true;
  actionError.value = null;
  try {
    entries.value = await fiscalService.fetchScadenzario();
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    loading.value = false;
  }
}

function formatMoney(value: string, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value));
}

function openEntry(entry: ScadenzarioEntry): void {
  if (entry.entry_type === 'PASSIVE') {
    router.push('/sales/passive-invoices');
    return;
  }
  router.push(`/sales/invoices/${entry.id}`);
}
</script>

<template>
  <AppLayout>
    <main class="page">
      <div class="page-header">
        <h1>{{ t('fiscal.scadenzario.title') }}</h1>
      </div>

      <p v-if="actionError" class="error">{{ t(actionError) }}</p>
      <div v-if="loading" class="empty">{{ t('app.loading') }}</div>
      <div v-else-if="!entries.length" class="empty">{{ t('fiscal.scadenzario.empty') }}</div>

      <div v-else class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>{{ t('fiscal.scadenzario.type') }}</th>
            <th>{{ t('fiscal.scadenzario.counterparty') }}</th>
            <th>{{ t('fiscal.passive.documentNumber') }}</th>
            <th>{{ t('fiscal.scadenzario.dueDate') }}</th>
            <th>{{ t('fiscal.passive.total') }}</th>
            <th>{{ t('fiscal.passive.paymentStatus') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in entries" :key="`${entry.entry_type}-${entry.id}`" class="clickable" @click="openEntry(entry)">
            <td>{{ t(`fiscal.scadenzario.types.${entry.entry_type}`) }}</td>
            <td>{{ entry.counterparty }}</td>
            <td>{{ entry.document_number }}</td>
            <td>{{ new Date(entry.due_date).toLocaleDateString() }}</td>
            <td>{{ formatMoney(entry.total, entry.currency) }}</td>
            <td>{{ t(`fiscal.paymentStatus.${entry.payment_status}`) }}</td>
          </tr>
        </tbody>
      </table>
      </div>
    </main>
  </AppLayout>
</template>

<style scoped>
.error {
  color: var(--danger);
  margin-bottom: 1rem;
}

.empty {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
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
  padding: 0.875rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

th {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-muted);
  background: var(--bg);
}

.clickable {
  cursor: pointer;
}

.clickable:hover {
  background: var(--primary-light);
}
</style>
