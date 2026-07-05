<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import FiscalProfileBanner from '@/components/FiscalProfileBanner.vue';
import * as salesService from '@/services/salesService';
import { extractApiError } from '@/services/api';
import type { SalesInvoice } from '@/types';

const { t } = useI18n();
const router = useRouter();
const invoices = ref<SalesInvoice[]>([]);
const loading = ref(true);
const searchQuery = ref('');
const statusFilter = ref('');
const actionError = ref<string | null>(null);

onMounted(load);

async function load(): Promise<void> {
  loading.value = true;
  try {
    invoices.value = await salesService.fetchInvoices({
      ...(searchQuery.value.trim() ? { search: searchQuery.value.trim() } : {}),
      ...(statusFilter.value ? { status: statusFilter.value } : {}),
    });
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    loading.value = false;
  }
}

function formatMoney(value: string, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value));
}
</script>

<template>
  <AppLayout>
    <main class="page">
      <div class="page-header">
        <h1>{{ t('sales.invoices.title') }}</h1>
      </div>
      <p v-if="actionError" class="error">{{ t(actionError) }}</p>

      <FiscalProfileBanner />

      <div class="toolbar">
        <input
          v-model="searchQuery"
          type="search"
          :placeholder="t('sales.searchPlaceholder')"
          @keyup.enter="load"
        />
        <select v-model="statusFilter" @change="load">
          <option value="">{{ t('sales.filter.allStatuses') }}</option>
          <option v-for="s in ['DRAFT','ISSUED','SENT','PAID','CANCELLED']" :key="s" :value="s">
            {{ t(`sales.invoices.statuses.${s}`) }}
          </option>
        </select>
        <button type="button" class="btn btn-ghost" @click="load">{{ t('sales.search') }}</button>
      </div>
      <div v-if="loading" class="empty">{{ t('app.loading') }}</div>
      <div v-else-if="!invoices.length" class="empty">{{ t('sales.invoices.empty') }}</div>
      <div v-else class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>{{ t('sales.columns.number') }}</th>
            <th>{{ t('sales.columns.customer') }}</th>
            <th>{{ t('sales.columns.status') }}</th>
            <th>{{ t('sales.invoices.sdiStatus') }}</th>
            <th>{{ t('sales.columns.total') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="invoice in invoices"
            :key="invoice.id"
            class="clickable"
            @click="router.push(`/sales/invoices/${invoice.id}`)"
          >
            <td>{{ invoice.document_number }}</td>
            <td>{{ invoice.customer_company_name || invoice.customer_name || '—' }}</td>
            <td>{{ t(`sales.invoices.statuses.${invoice.status}`) }}</td>
            <td>{{ t(`sales.invoices.sdi.${invoice.sdi_status}`) }}</td>
            <td>{{ formatMoney(invoice.total, invoice.currency) }}</td>
          </tr>
        </tbody>
      </table>
      </div>
    </main>
  </AppLayout>
</template>

<style scoped>
.error { color: var(--danger); margin-bottom: 1rem; }
.toolbar { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
.toolbar input { flex: 1; max-width: 320px; }
.empty { text-align: center; padding: 2rem; color: var(--text-muted); }
.data-table { width: 100%; border-collapse: collapse; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
th, td { padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid var(--border); }
th { font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); background: var(--bg); }
.clickable { cursor: pointer; }
.clickable:hover { background: var(--primary-light); }
</style>
