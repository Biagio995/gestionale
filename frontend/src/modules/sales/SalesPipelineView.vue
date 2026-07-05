<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import FiscalProfileBanner from '@/components/FiscalProfileBanner.vue';
import * as salesService from '@/services/salesService';
import { extractApiError } from '@/services/api';
import type { SalesDeliveryNote, SalesInvoice, SalesOrder, SalesQuote } from '@/types';

const { t } = useI18n();
const router = useRouter();

const loading = ref(true);
const actionError = ref<string | null>(null);
const quotes = ref<SalesQuote[]>([]);
const orders = ref<SalesOrder[]>([]);
const deliveryNotes = ref<SalesDeliveryNote[]>([]);
const invoices = ref<SalesInvoice[]>([]);

onMounted(load);

async function load(): Promise<void> {
  loading.value = true;
  actionError.value = null;
  try {
    const data = await salesService.fetchPipeline();
    quotes.value = data.quotes;
    orders.value = data.orders;
    deliveryNotes.value = data.deliveryNotes;
    invoices.value = data.invoices;
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    loading.value = false;
  }
}

function formatMoney(value: string, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value));
}

function openQuote(q: SalesQuote): void {
  router.push(`/sales/quotes/${q.id}`);
}
function openOrder(o: SalesOrder): void {
  router.push(`/sales/orders/${o.id}`);
}
function openDdt(d: SalesDeliveryNote): void {
  router.push(`/sales/delivery-notes/${d.id}`);
}
function openInvoice(i: SalesInvoice): void {
  router.push(`/sales/invoices/${i.id}`);
}
</script>

<template>
  <AppLayout>
    <main class="page">
      <div class="page-header">
        <h1>{{ t('sales.pipeline.title') }}</h1>
      </div>

      <FiscalProfileBanner />
      <p v-if="actionError" class="error">{{ t(actionError) }}</p>
      <div v-if="loading" class="empty">{{ t('app.loading') }}</div>

      <div v-else class="pipeline-grid">
        <section class="column card">
          <h2>{{ t('sales.quotes.title') }}</h2>
          <div v-if="!quotes.length" class="mini-empty">{{ t('sales.quotes.empty') }}</div>
          <button
            v-for="q in quotes.filter((x) => !['CONVERTED', 'CANCELLED', 'REJECTED'].includes(x.status))"
            :key="q.id"
            type="button"
            class="pipeline-item"
            @click="openQuote(q)"
          >
            <strong>{{ q.document_number }}</strong>
            <span>{{ q.customer_company_name || q.customer_name }}</span>
            <span>{{ formatMoney(q.total, q.currency) }}</span>
          </button>
        </section>

        <section class="column card">
          <h2>{{ t('sales.orders.title') }}</h2>
          <div v-if="!orders.length" class="mini-empty">{{ t('sales.orders.empty') }}</div>
          <button
            v-for="o in orders.filter((x) => x.status !== 'CONVERTED' && x.status !== 'CANCELLED')"
            :key="o.id"
            type="button"
            class="pipeline-item"
            @click="openOrder(o)"
          >
            <strong>{{ o.document_number }}</strong>
            <span>{{ o.customer_company_name || o.customer_name }}</span>
            <span>{{ formatMoney(o.total, o.currency) }}</span>
          </button>
        </section>

        <section class="column card">
          <h2>{{ t('sales.deliveryNotes.title') }}</h2>
          <div v-if="!deliveryNotes.length" class="mini-empty">{{ t('sales.deliveryNotes.empty') }}</div>
          <button
            v-for="d in deliveryNotes.filter((x) => x.status !== 'INVOICED' && x.status !== 'CANCELLED')"
            :key="d.id"
            type="button"
            class="pipeline-item"
            @click="openDdt(d)"
          >
            <strong>{{ d.document_number }}</strong>
            <span>{{ d.customer_company_name || d.customer_name }}</span>
            <span>{{ formatMoney(d.total, d.currency) }}</span>
          </button>
        </section>

        <section class="column card">
          <h2>{{ t('sales.invoices.title') }}</h2>
          <div v-if="!invoices.length" class="mini-empty">{{ t('sales.invoices.empty') }}</div>
          <button
            v-for="i in invoices.filter((x) => x.status !== 'CANCELLED' && x.status !== 'PAID')"
            :key="i.id"
            type="button"
            class="pipeline-item"
            @click="openInvoice(i)"
          >
            <strong>{{ i.document_number }}</strong>
            <span>{{ i.customer_company_name || i.customer_name }}</span>
            <span>{{ formatMoney(i.total, i.currency) }}</span>
          </button>
        </section>
      </div>
    </main>
  </AppLayout>
</template>

<style scoped>
.error { color: var(--danger); margin-bottom: 1rem; }
.empty, .mini-empty { text-align: center; padding: 1rem; color: var(--text-muted); font-size: 0.9rem; }
.pipeline-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  align-items: start;
}
@media (max-width: 1100px) {
  .pipeline-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .pipeline-grid { grid-template-columns: 1fr; }
}
.column {
  padding: 1rem;
  min-height: 200px;
}
.column h2 {
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-muted);
}
.pipeline-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  width: 100%;
  text-align: left;
  padding: 0.6rem 0.5rem;
  margin-bottom: 0.35rem;
  border: none;
  border-bottom: 1px solid var(--border);
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
}
.pipeline-item:hover {
  background: var(--primary-light);
}
.pipeline-item span {
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>
