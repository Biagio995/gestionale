<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import ContactForm from './ContactForm.vue';
import * as crmService from '@/services/crmService';
import { extractApiError } from '@/services/api';
import type { ContactPayload, ContactStatus, CrmContact } from '@/types';

const { t } = useI18n();
const router = useRouter();

const contacts = ref<CrmContact[]>([]);
const loading = ref(true);
const statusFilter = ref<ContactStatus | ''>('');
const showForm = ref(false);
const editingContact = ref<CrmContact | null>(null);
const actionError = ref<string | null>(null);

const filteredContacts = computed(() => {
  if (!statusFilter.value) return contacts.value;
  return contacts.value.filter((c) => c.status === statusFilter.value);
});

onMounted(load);

async function load(): Promise<void> {
  loading.value = true;
  actionError.value = null;
  try {
    contacts.value = await crmService.fetchContacts();
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  editingContact.value = null;
  showForm.value = true;
}

function openEdit(contact: CrmContact): void {
  editingContact.value = contact;
  showForm.value = true;
}

function closeForm(): void {
  showForm.value = false;
  editingContact.value = null;
}

async function onSave(payload: ContactPayload): Promise<void> {
  actionError.value = null;
  try {
    if (editingContact.value) {
      await crmService.updateContact(editingContact.value.id, payload);
    } else {
      await crmService.createContact(payload);
    }
    closeForm();
    await load();
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  }
}

async function onDelete(contact: CrmContact): Promise<void> {
  if (!confirm(t('crm.contacts.confirmDelete'))) return;
  actionError.value = null;
  try {
    await crmService.deleteContact(contact.id);
    await load();
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  }
}

function contactName(c: CrmContact): string {
  return `${c.first_name} ${c.last_name}`.trim();
}
</script>

<template>
  <AppLayout>
    <main class="page">
      <div class="page-header">
        <h1>{{ t('crm.contacts.title') }}</h1>
        <button type="button" class="btn btn-primary" @click="openCreate">
          {{ t('crm.contacts.create') }}
        </button>
      </div>

      <div class="filters">
        <select v-model="statusFilter">
          <option value="">{{ t('crm.contacts.allStatuses') }}</option>
          <option value="LEAD">{{ t('crm.contacts.statuses.LEAD') }}</option>
          <option value="CUSTOMER">{{ t('crm.contacts.statuses.CUSTOMER') }}</option>
          <option value="INACTIVE">{{ t('crm.contacts.statuses.INACTIVE') }}</option>
        </select>
      </div>

      <p v-if="actionError" class="error">{{ t(actionError) }}</p>

      <ContactForm
        v-if="showForm"
        :contact="editingContact"
        @save="onSave"
        @cancel="closeForm"
      />

      <div v-if="loading" class="empty">{{ t('app.loading') }}</div>

      <div v-else-if="!filteredContacts.length" class="empty">
        {{ t('crm.contacts.empty') }}
      </div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>{{ t('crm.contacts.name') }}</th>
            <th>{{ t('crm.contacts.company') }}</th>
            <th>{{ t('crm.contacts.email') }}</th>
            <th>{{ t('crm.contacts.status') }}</th>
            <th>{{ t('crm.deals.title') }}</th>
            <th>{{ t('crm.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="contact in filteredContacts"
            :key="contact.id"
            class="clickable"
            @click="router.push(`/crm/contacts/${contact.id}`)"
          >
            <td class="name-cell">{{ contactName(contact) }}</td>
            <td>{{ contact.company_name || '—' }}</td>
            <td>{{ contact.email || '—' }}</td>
            <td>
              <span class="badge" :class="contact.status.toLowerCase()">
                {{ t(`crm.contacts.statuses.${contact.status}`) }}
              </span>
            </td>
            <td>{{ contact.deals_count ?? 0 }}</td>
            <td class="row-actions" @click.stop>
              <button type="button" class="btn btn-ghost" @click="openEdit(contact)">
                {{ t('crm.edit') }}
              </button>
              <button type="button" class="btn btn-danger" @click="onDelete(contact)">
                {{ t('crm.delete') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </main>
  </AppLayout>
</template>

<style scoped>
.filters {
  margin-bottom: 1rem;
}

.filters select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font: inherit;
}

.error {
  color: var(--danger);
  margin-bottom: 1rem;
}

.empty {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: 12px;
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
  letter-spacing: 0.05em;
  color: var(--text-muted);
  background: var(--bg);
}

.clickable {
  cursor: pointer;
}

.clickable:hover {
  background: var(--primary-light);
}

.name-cell {
  font-weight: 600;
}

.row-actions {
  display: flex;
  gap: 0.5rem;
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge.lead {
  background: var(--warning-light);
  color: var(--warning);
}

.badge.customer {
  background: var(--success-light);
  color: var(--success);
}

.badge.inactive {
  background: var(--bg);
  color: var(--text-muted);
}
</style>
