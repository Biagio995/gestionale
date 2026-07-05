<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import type { DocumentChain } from '@/types';

defineProps<{
  chain: DocumentChain | null;
}>();

const { t } = useI18n();
const router = useRouter();

function goQuote(id: string): void {
  router.push(`/sales/quotes/${id}`);
}
function goOrder(id: string): void {
  router.push(`/sales/orders/${id}`);
}
function goDdt(id: string): void {
  router.push(`/sales/delivery-notes/${id}`);
}
function goInvoice(id: string): void {
  router.push(`/sales/invoices/${id}`);
}
</script>

<template>
  <div v-if="chain && (chain.quote || chain.order || chain.deliveryNotes.length || chain.invoices.length)" class="chain card">
    <h2>{{ t('sales.chain.title') }}</h2>
    <ol class="chain-list">
      <li v-if="chain.quote">
        <button type="button" class="chain-link" @click="goQuote(chain.quote!.id)">
          {{ t('sales.documentTypes.QUOTE') }} · {{ chain.quote.document_number }}
        </button>
        <span class="status">{{ t(`sales.quotes.statuses.${chain.quote.status}`) }}</span>
      </li>
      <li v-if="chain.order">
        <button type="button" class="chain-link" @click="goOrder(chain.order!.id)">
          {{ t('sales.documentTypes.ORDER') }} · {{ chain.order.document_number }}
        </button>
        <span class="status">{{ t(`sales.orders.statuses.${chain.order.status}`) }}</span>
      </li>
      <li v-for="ddt in chain.deliveryNotes" :key="ddt.id">
        <button type="button" class="chain-link" @click="goDdt(ddt.id)">
          {{ t('sales.documentTypes.DELIVERY_NOTE') }} · {{ ddt.document_number }}
        </button>
        <span class="status">{{ t(`sales.deliveryNotes.statuses.${ddt.status}`) }}</span>
      </li>
      <li v-for="inv in chain.invoices" :key="inv.id">
        <button type="button" class="chain-link" @click="goInvoice(inv.id)">
          {{ t('sales.documentTypes.INVOICE') }} · {{ inv.document_number }}
        </button>
        <span class="status">{{ t(`sales.invoices.statuses.${inv.status}`) }}</span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.chain {
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
}
.chain h2 {
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
}
.chain-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.chain-list li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.chain-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--primary);
  cursor: pointer;
  font-weight: 600;
  text-align: left;
}
.chain-link:hover {
  text-decoration: underline;
}
.status {
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>
