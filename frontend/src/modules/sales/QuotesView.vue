<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import FiscalProfileBanner from '@/components/FiscalProfileBanner.vue';
import DocumentLinesEditor from './DocumentLinesEditor.vue';
import * as crmService from '@/services/crmService';
import * as salesService from '@/services/salesService';
import * as fiscalService from '@/services/fiscalService';
import { extractApiError } from '@/services/api';
import { validateItalianVat } from '@/utils/italianFiscal';
import type { CrmContact, QuotePayload, SalesLinePayload, SalesQuote } from '@/types';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const quotes = ref<SalesQuote[]>([]);
const contacts = ref<CrmContact[]>([]);
const loading = ref(true);
const showForm = ref(false);
const saving = ref(false);
const searchQuery = ref('');
const statusFilter = ref('');
const validatingVat = ref(false);
const vatFeedback = ref<string | null>(null);
const vatValid = ref<boolean | null>(null);
const actionError = ref<string | null>(null);

const form = reactive<QuotePayload>({
  contactId: null,
  customerCompanyName: '',
  customerName: '',
  customerVatNumber: '',
  customerTaxCode: '',
  customerSdiCode: '',
  customerPecEmail: '',
  customerEmail: '',
  customerAddress: '',
  notes: '',
  lines: [{ description: '', quantity: 1, unitPrice: 0, taxRate: 22 }],
});

onMounted(async () => {
  await Promise.all([loadQuotes(), loadContacts()]);
  const contactId = route.query.contactId;
  if (typeof contactId === 'string' && contactId) {
    form.contactId = contactId;
    onContactChange();
    showForm.value = true;
  }
});

async function loadQuotes(): Promise<void> {
  loading.value = true;
  actionError.value = null;
  try {
    quotes.value = await salesService.fetchQuotes({
      ...(searchQuery.value.trim() ? { search: searchQuery.value.trim() } : {}),
      ...(statusFilter.value ? { status: statusFilter.value } : {}),
    });
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    loading.value = false;
  }
}

async function loadContacts(): Promise<void> {
  try {
    contacts.value = await crmService.fetchContacts();
  } catch {
    /* optional */
  }
}

function openCreate(): void {
  showForm.value = true;
  actionError.value = null;
}

function closeForm(): void {
  showForm.value = false;
}

function onContactChange(): void {
  const contact = contacts.value.find((c) => c.id === form.contactId);
  if (!contact) return;
  form.customerCompanyName = contact.company_name ?? '';
  form.customerName = `${contact.first_name} ${contact.last_name}`.trim();
  form.customerEmail = contact.email ?? '';
  form.customerVatNumber = contact.vat_number ?? '';
  form.customerTaxCode = contact.tax_code ?? '';
  form.customerSdiCode = contact.sdi_code ?? '';
  form.customerPecEmail = contact.pec_email ?? '';
  form.customerAddress = contact.address ?? '';
  vatFeedback.value = null;
  vatValid.value = null;
}

async function onValidateVat(): Promise<void> {
  const vat = form.customerVatNumber?.trim() ?? '';
  if (!vat) return;
  validatingVat.value = true;
  vatFeedback.value = null;
  vatValid.value = null;
  const local = validateItalianVat(vat);
  if (!local.checksumValid) {
    vatValid.value = false;
    vatFeedback.value = t('fiscal.vat.invalid');
    validatingVat.value = false;
    return;
  }
  try {
    const result = await fiscalService.validateVat(vat);
    vatValid.value = result.valid;
    if (result.normalized) form.customerVatNumber = result.normalized;
    vatFeedback.value = result.valid
      ? [t('fiscal.vat.valid'), result.viesName].filter(Boolean).join(' — ')
      : t('fiscal.vat.invalid');
  } catch {
    vatValid.value = local.valid;
    vatFeedback.value = local.valid ? t('fiscal.vat.validLocal') : t('fiscal.vat.invalid');
  } finally {
    validatingVat.value = false;
  }
}

function formatMoney(value: string, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value));
}

async function onSubmit(): Promise<void> {
  saving.value = true;
  actionError.value = null;
  try {
    const quote = await salesService.createQuote({
      ...form,
      customerCompanyName: form.customerCompanyName || null,
      customerName: form.customerName || null,
      customerVatNumber: form.customerVatNumber || null,
      customerTaxCode: form.customerTaxCode || null,
      customerSdiCode: form.customerSdiCode || null,
      customerPecEmail: form.customerPecEmail || null,
      customerEmail: form.customerEmail || null,
      customerAddress: form.customerAddress || null,
      notes: form.notes || null,
      lines: form.lines.filter((l) => l.description.trim()),
    });
    closeForm();
    await loadQuotes();
    router.push(`/sales/quotes/${quote.id}`);
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    saving.value = false;
  }
}

function onLinesUpdate(lines: SalesLinePayload[]): void {
  form.lines = lines;
}
</script>

<template>
  <AppLayout>
    <main class="page">
      <div class="page-header">
        <h1>{{ t('sales.quotes.title') }}</h1>
        <button type="button" class="btn btn-primary" @click="openCreate">
          {{ t('sales.quotes.create') }}
        </button>
      </div>

      <p v-if="actionError" class="error">{{ t(actionError) }}</p>

      <FiscalProfileBanner />

      <div class="toolbar">
        <input
          v-model="searchQuery"
          type="search"
          :placeholder="t('sales.searchPlaceholder')"
          @keyup.enter="loadQuotes"
        />
        <select v-model="statusFilter" @change="loadQuotes">
          <option value="">{{ t('sales.filter.allStatuses') }}</option>
          <option v-for="s in ['DRAFT','SENT','ACCEPTED','REJECTED','CANCELLED','CONVERTED']" :key="s" :value="s">
            {{ t(`sales.quotes.statuses.${s}`) }}
          </option>
        </select>
        <button type="button" class="btn btn-ghost" @click="loadQuotes">{{ t('sales.search') }}</button>
      </div>

      <form v-if="showForm" class="card form-card" @submit.prevent="onSubmit">
        <h2>{{ t('sales.quotes.create') }}</h2>

        <label>
          <span>{{ t('sales.customer.contact') }}</span>
          <select v-model="form.contactId" @change="onContactChange">
            <option :value="null">{{ t('sales.customer.manual') }}</option>
            <option v-for="c in contacts" :key="c.id" :value="c.id">
              {{ c.company_name || `${c.first_name} ${c.last_name}` }}
            </option>
          </select>
        </label>

        <div class="grid-2">
          <label>
            <span>{{ t('sales.customer.name') }}</span>
            <input v-model="form.customerName" required />
          </label>
          <label>
            <span>{{ t('sales.customer.company') }}</span>
            <input v-model="form.customerCompanyName" />
          </label>
          <label>
            <span>{{ t('sales.customer.vat') }}</span>
            <div class="input-with-action">
              <input v-model="form.customerVatNumber" />
              <button
                type="button"
                class="btn btn-ghost"
                :disabled="validatingVat || !(form.customerVatNumber?.trim())"
                @click="onValidateVat"
              >
                {{ t('fiscal.vat.validate') }}
              </button>
            </div>
            <span v-if="vatFeedback" :class="vatValid ? 'vat-ok' : 'vat-ko'">{{ vatFeedback }}</span>
          </label>
          <label>
            <span>{{ t('sales.customer.taxCode') }}</span>
            <input v-model="form.customerTaxCode" />
          </label>
          <label>
            <span>{{ t('fiscal.settings.sdiCode') }}</span>
            <input v-model="form.customerSdiCode" maxlength="7" />
          </label>
          <label>
            <span>{{ t('fiscal.settings.pecEmail') }}</span>
            <input v-model="form.customerPecEmail" type="email" />
          </label>
          <label class="full-width">
            <span>{{ t('sales.customer.address') }}</span>
            <input v-model="form.customerAddress" />
          </label>
        </div>

        <DocumentLinesEditor :model-value="form.lines" @update:model-value="onLinesUpdate" />

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" @click="closeForm">{{ t('sales.cancel') }}</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ t('sales.quotes.save') }}
          </button>
        </div>
      </form>

      <div v-if="loading" class="empty">{{ t('app.loading') }}</div>
      <div v-else-if="!quotes.length" class="empty">{{ t('sales.quotes.empty') }}</div>

      <div v-else class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>{{ t('sales.columns.number') }}</th>
            <th>{{ t('sales.columns.customer') }}</th>
            <th>{{ t('sales.columns.status') }}</th>
            <th>{{ t('sales.columns.total') }}</th>
            <th>{{ t('sales.columns.date') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="quote in quotes"
            :key="quote.id"
            class="clickable"
            @click="router.push(`/sales/quotes/${quote.id}`)"
          >
            <td>{{ quote.document_number }}</td>
            <td>{{ quote.customer_company_name || quote.customer_name || '—' }}</td>
            <td><span class="badge">{{ t(`sales.quotes.statuses.${quote.status}`) }}</span></td>
            <td>{{ formatMoney(quote.total, quote.currency) }}</td>
            <td>{{ new Date(quote.created_at).toLocaleDateString() }}</td>
          </tr>
        </tbody>
      </table>
      </div>
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
select {
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

.clickable {
  cursor: pointer;
}

.clickable:hover {
  background: var(--primary-light);
}

.badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
}

@media (max-width: 768px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}

.input-with-action {
  display: flex;
  gap: 0.5rem;
}

.input-with-action input {
  flex: 1;
}

.vat-ok {
  color: var(--success, #15803d);
  font-size: 0.8rem;
}

.vat-ko {
  color: var(--danger);
  font-size: 0.8rem;
}

.toolbar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.toolbar input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
}
</style>
