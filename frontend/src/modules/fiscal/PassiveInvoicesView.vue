<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/components/AppLayout.vue';
import * as fiscalService from '@/services/fiscalService';
import { extractApiError } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import type { PassiveInvoice, PaymentStatus } from '@/types';

const { t } = useI18n();
const auth = useAuthStore();

const invoices = ref<PassiveInvoice[]>([]);
const loading = ref(true);
const showForm = ref(false);
const saving = ref(false);
const payingId = ref<string | null>(null);
const paymentAmount = ref('');
const importing = ref(false);
const actionError = ref<string | null>(null);

const form = reactive({
  supplierName: '',
  supplierVatNumber: '',
  supplierTaxCode: '',
  documentNumber: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  total: 0,
  notes: '',
});

onMounted(load);

async function load(): Promise<void> {
  loading.value = true;
  actionError.value = null;
  try {
    invoices.value = await fiscalService.fetchPassiveInvoices();
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  showForm.value = true;
  actionError.value = null;
}

function closeForm(): void {
  showForm.value = false;
}

function formatMoney(value: string, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value));
}

function paymentLabel(status: PaymentStatus): string {
  return t(`fiscal.paymentStatus.${status}`);
}

async function onSubmit(): Promise<void> {
  saving.value = true;
  actionError.value = null;
  try {
    await fiscalService.createPassiveInvoice({
      supplierName: form.supplierName.trim(),
      supplierVatNumber: form.supplierVatNumber.trim() || null,
      supplierTaxCode: form.supplierTaxCode.trim() || null,
      documentNumber: form.documentNumber.trim(),
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate || null,
      total: form.total,
      notes: form.notes.trim() || null,
    });
    closeForm();
    await load();
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    saving.value = false;
  }
}

async function recordPayment(invoice: PassiveInvoice): Promise<void> {
  payingId.value = invoice.id;
  actionError.value = null;
  const amount = Number(paymentAmount.value || invoice.total);
  try {
    await fiscalService.recordPassivePayment(invoice.id, amount);
    paymentAmount.value = '';
    await load();
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    payingId.value = null;
  }
}

async function onImportXml(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  importing.value = true;
  actionError.value = null;
  try {
    const xmlContent = await file.text();
    await fiscalService.importPassiveInvoiceXml(xmlContent);
    await load();
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    importing.value = false;
    input.value = '';
  }
}
</script>

<template>
  <AppLayout>
    <main class="page">
      <div class="page-header">
        <h1>{{ t('fiscal.passive.title') }}</h1>
        <div class="header-actions">
          <label v-if="auth.isAdmin" class="btn btn-ghost import-btn">
            {{ importing ? t('app.loading') : t('fiscal.passive.importXml') }}
            <input type="file" accept=".xml,text/xml" hidden @change="onImportXml" />
          </label>
          <button v-if="auth.isAdmin" type="button" class="btn btn-primary" @click="openCreate">
            {{ t('fiscal.passive.create') }}
          </button>
        </div>
      </div>

      <p v-if="actionError" class="error">{{ t(actionError) }}</p>

      <form v-if="showForm" class="card form-card" @submit.prevent="onSubmit">
        <h2>{{ t('fiscal.passive.create') }}</h2>
        <div class="grid-2">
          <label>
            <span>{{ t('fiscal.passive.supplier') }}</span>
            <input v-model="form.supplierName" required />
          </label>
          <label>
            <span>{{ t('fiscal.passive.documentNumber') }}</span>
            <input v-model="form.documentNumber" required />
          </label>
          <label>
            <span>{{ t('fiscal.passive.supplierVat') }}</span>
            <input v-model="form.supplierVatNumber" />
          </label>
          <label>
            <span>{{ t('fiscal.passive.supplierTaxCode') }}</span>
            <input v-model="form.supplierTaxCode" />
          </label>
          <label>
            <span>{{ t('fiscal.passive.invoiceDate') }}</span>
            <input v-model="form.invoiceDate" type="date" required />
          </label>
          <label>
            <span>{{ t('fiscal.passive.dueDate') }}</span>
            <input v-model="form.dueDate" type="date" />
          </label>
          <label>
            <span>{{ t('fiscal.passive.total') }}</span>
            <input v-model.number="form.total" type="number" min="0" step="0.01" required />
          </label>
        </div>
        <label>
          <span>{{ t('fiscal.passive.notes') }}</span>
          <textarea v-model="form.notes" rows="2" />
        </label>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" @click="closeForm">{{ t('sales.cancel') }}</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">{{ t('crm.save') }}</button>
        </div>
      </form>

      <div v-if="loading" class="empty">{{ t('app.loading') }}</div>
      <div v-else-if="!invoices.length" class="empty">{{ t('fiscal.passive.empty') }}</div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>{{ t('fiscal.passive.documentNumber') }}</th>
            <th>{{ t('fiscal.passive.supplier') }}</th>
            <th>{{ t('fiscal.passive.invoiceDate') }}</th>
            <th>{{ t('fiscal.passive.total') }}</th>
            <th>{{ t('fiscal.passive.paymentStatus') }}</th>
            <th v-if="auth.isAdmin"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="invoice in invoices" :key="invoice.id">
            <td>{{ invoice.document_number }}</td>
            <td>{{ invoice.supplier_name }}</td>
            <td>{{ new Date(invoice.invoice_date).toLocaleDateString() }}</td>
            <td>{{ formatMoney(invoice.total, invoice.currency) }}</td>
            <td>{{ paymentLabel(invoice.payment_status) }}</td>
            <td v-if="auth.isAdmin" class="payment-cell">
              <template v-if="invoice.payment_status !== 'PAID'">
                <input
                  v-model="paymentAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  :placeholder="invoice.total"
                  class="pay-input"
                />
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  :disabled="payingId === invoice.id"
                  @click="recordPayment(invoice)"
                >
                  {{ t('fiscal.passive.recordPayment') }}
                </button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </main>
  </AppLayout>
</template>

<style scoped>
.form-card {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
}

input,
textarea {
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

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

.btn-sm {
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.import-btn {
  cursor: pointer;
  position: relative;
}

.payment-cell {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}

.pay-input {
  width: 90px;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
}

@media (max-width: 768px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
