<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import DealForm from './DealForm.vue';
import * as crmService from '@/services/crmService';
import * as salesService from '@/services/salesService';
import { extractApiError } from '@/services/api';
import type { ActivityPayload, ContactDocumentSummary, CrmContactDetail, DealPayload } from '@/types';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const detail = ref<CrmContactDetail | null>(null);
const documents = ref<ContactDocumentSummary[]>([]);
const loading = ref(true);
const actionError = ref<string | null>(null);
const showDealForm = ref(false);

const activityType = ref<'NOTE' | 'CALL' | 'EMAIL' | 'MEETING' | 'TASK'>('NOTE');
const activitySubject = ref('');
const activityBody = ref('');

onMounted(load);

async function load(): Promise<void> {
  loading.value = true;
  actionError.value = null;
  try {
    detail.value = await crmService.fetchContact(String(route.params.id));
    documents.value = await salesService.fetchContactDocuments(String(route.params.id));
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    loading.value = false;
  }
}

async function addActivity(): Promise<void> {
  if (!detail.value || !activitySubject.value.trim()) return;
  actionError.value = null;
  const payload: ActivityPayload = {
    contactId: detail.value.contact.id,
    activityType: activityType.value,
    subject: activitySubject.value.trim(),
    body: activityBody.value || null,
  };
  try {
    await crmService.createActivity(payload);
    activitySubject.value = '';
    activityBody.value = '';
    await load();
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  }
}

async function onCreateDeal(payload: DealPayload): Promise<void> {
  if (!detail.value) return;
  actionError.value = null;
  try {
    await crmService.createDeal({
      ...payload,
      contactId: detail.value.contact.id,
    });
    showDealForm.value = false;
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function createQuote(): void {
  if (!detail.value) return;
  router.push({ path: '/sales/quotes', query: { contactId: detail.value.contact.id } });
}

function openDocument(doc: ContactDocumentSummary): void {
  const pathMap = {
    QUOTE: 'quotes',
    ORDER: 'orders',
    DELIVERY_NOTE: 'delivery-notes',
    INVOICE: 'invoices',
  } as const;
  router.push(`/sales/${pathMap[doc.document_type]}/${doc.id}`);
}
</script>

<template>
  <AppLayout>
    <main class="page">
      <div class="page-header">
        <div>
          <button type="button" class="btn btn-ghost back-btn" @click="router.push('/crm/contacts')">
            ← {{ t('crm.back') }}
          </button>
          <h1 v-if="detail">
            {{ detail.contact.first_name }} {{ detail.contact.last_name }}
          </h1>
          <p v-if="detail?.contact.company_name" class="subtitle">
            {{ detail.contact.company_name }}
            <span v-if="detail.contact.job_title"> · {{ detail.contact.job_title }}</span>
          </p>
        </div>
        <button type="button" class="btn btn-secondary" @click="createQuote">
          {{ t('sales.quotes.create') }}
        </button>
        <button type="button" class="btn btn-primary" @click="showDealForm = !showDealForm">
          {{ t('crm.deals.create') }}
        </button>
      </div>

      <p v-if="actionError" class="error">{{ t(actionError) }}</p>
      <div v-if="loading" class="empty">{{ t('app.loading') }}</div>

      <template v-else-if="detail">
        <div class="info-grid">
          <div class="card info-card">
            <h2>{{ t('crm.contacts.details') }}</h2>
            <dl>
              <dt>{{ t('crm.contacts.email') }}</dt>
              <dd>{{ detail.contact.email || '—' }}</dd>
              <dt>{{ t('crm.contacts.phone') }}</dt>
              <dd>{{ detail.contact.phone || '—' }}</dd>
              <dt>{{ t('crm.contacts.status') }}</dt>
              <dd>{{ t(`crm.contacts.statuses.${detail.contact.status}`) }}</dd>
              <dt v-if="detail.contact.vat_number">{{ t('sales.customer.vat') }}</dt>
              <dd v-if="detail.contact.vat_number">{{ detail.contact.vat_number }}</dd>
              <dt v-if="detail.contact.tax_code">{{ t('sales.customer.taxCode') }}</dt>
              <dd v-if="detail.contact.tax_code">{{ detail.contact.tax_code }}</dd>
              <dt v-if="detail.contact.sdi_code">{{ t('fiscal.settings.sdiCode') }}</dt>
              <dd v-if="detail.contact.sdi_code">{{ detail.contact.sdi_code }}</dd>
              <dt v-if="detail.contact.pec_email">{{ t('fiscal.settings.pecEmail') }}</dt>
              <dd v-if="detail.contact.pec_email">{{ detail.contact.pec_email }}</dd>
              <dt v-if="detail.contact.notes">{{ t('crm.contacts.notes') }}</dt>
              <dd v-if="detail.contact.notes">{{ detail.contact.notes }}</dd>
            </dl>
          </div>

          <div class="card">
            <h2>{{ t('crm.deals.title') }} ({{ detail.deals.length }})</h2>
            <div v-if="!detail.deals.length" class="mini-empty">{{ t('crm.deals.empty') }}</div>
            <ul v-else class="deal-list">
              <li v-for="deal in detail.deals" :key="deal.id">
                <strong>{{ deal.title }}</strong>
                <span>{{ formatCurrency(deal.value, deal.currency) }}</span>
                <span class="stage">{{ t(`crm.deals.stages.${deal.stage}`) }}</span>
              </li>
            </ul>
          </div>

          <div class="card">
            <h2>{{ t('sales.contactDocuments') }}</h2>
            <div v-if="!documents.length" class="mini-empty">{{ t('sales.contactDocumentsEmpty') }}</div>
            <ul v-else class="deal-list">
              <li
                v-for="doc in documents"
                :key="`${doc.document_type}-${doc.id}`"
                class="clickable-doc"
                @click="openDocument(doc)"
              >
                <strong>{{ doc.document_number }}</strong>
                <span>{{ t(`sales.documentTypes.${doc.document_type}`) }}</span>
                <span>{{ formatCurrency(doc.total, doc.currency) }}</span>
              </li>
            </ul>
          </div>
        </div>

        <DealForm
          v-if="showDealForm"
          :contacts="[detail.contact]"
          :default-contact-id="detail.contact.id"
          @save="onCreateDeal"
          @cancel="showDealForm = false"
        />

        <div class="card activity-section">
          <h2>{{ t('crm.activities.title') }}</h2>

          <form class="activity-form" @submit.prevent="addActivity">
            <select v-model="activityType">
              <option value="NOTE">{{ t('crm.activities.types.NOTE') }}</option>
              <option value="CALL">{{ t('crm.activities.types.CALL') }}</option>
              <option value="EMAIL">{{ t('crm.activities.types.EMAIL') }}</option>
              <option value="MEETING">{{ t('crm.activities.types.MEETING') }}</option>
              <option value="TASK">{{ t('crm.activities.types.TASK') }}</option>
            </select>
            <input v-model="activitySubject" type="text" :placeholder="t('crm.activities.subject')" required />
            <textarea v-model="activityBody" rows="2" :placeholder="t('crm.activities.body')" />
            <button type="submit" class="btn btn-primary">{{ t('crm.activities.add') }}</button>
          </form>

          <div v-if="!detail.activities.length" class="mini-empty">{{ t('crm.activities.empty') }}</div>
          <ul v-else class="timeline">
            <li v-for="act in detail.activities" :key="act.id">
              <div class="timeline-meta">
                <span class="type">{{ t(`crm.activities.types.${act.activity_type}`) }}</span>
                <span class="date">{{ formatDate(act.created_at) }}</span>
              </div>
              <strong>{{ act.subject }}</strong>
              <p v-if="act.body">{{ act.body }}</p>
            </li>
          </ul>
        </div>
      </template>
    </main>
  </AppLayout>
</template>

<style scoped>
.back-btn {
  margin-bottom: 0.5rem;
  padding-left: 0;
}

.subtitle {
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.error {
  color: var(--danger);
  margin-bottom: 1rem;
}

.empty,
.mini-empty {
  color: var(--text-muted);
  padding: 1rem 0;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.info-card dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
}

.info-card dt {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.info-card h2,
.activity-section h2 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

.deal-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.deal-list li {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.deal-list .stage {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.clickable-doc {
  cursor: pointer;
}

.clickable-doc:hover {
  background: var(--bg);
}

.activity-section {
  padding: 1.25rem;
}

.activity-form {
  display: grid;
  grid-template-columns: 140px 1fr auto;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.activity-form textarea {
  grid-column: 2 / 3;
}

.activity-form button {
  grid-column: 3;
  align-self: end;
}

.activity-form input,
.activity-form select,
.activity-form textarea {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font: inherit;
}

.timeline {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.timeline-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.timeline .type {
  font-weight: 600;
  color: var(--primary);
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .activity-form {
    grid-template-columns: 1fr;
  }

  .activity-form textarea,
  .activity-form button {
    grid-column: 1;
  }
}
</style>
