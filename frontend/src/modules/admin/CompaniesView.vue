<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/components/AppLayout.vue';
import { useAdminStore } from '@/stores/admin';
import type { Company } from '@/types';
import { extractApiError } from '@/services/api';

const { t } = useI18n();
const admin = useAdminStore();

const showCreateForm = ref(false);
const editingCompany = ref<Company | null>(null);
const errorKey = ref<string | null>(null);
const createSuccess = ref<string | null>(null);

const createForm = reactive({
  name: '',
  contactEmail: '',
  adminEmail: '',
});

const editForm = reactive({
  name: '',
  contactEmail: '',
  status: 'ACTIVE' as Company['status'],
});

onMounted(() => admin.loadCompanies());

function openCreate(): void {
  editingCompany.value = null;
  showCreateForm.value = true;
  createSuccess.value = null;
  errorKey.value = null;
}

function openEdit(company: Company): void {
  showCreateForm.value = false;
  editingCompany.value = company;
  editForm.name = company.name;
  editForm.contactEmail = company.contact_email ?? '';
  editForm.status = company.status;
  errorKey.value = null;
}

function closeForms(): void {
  showCreateForm.value = false;
  editingCompany.value = null;
}

async function onCreate(): Promise<void> {
  errorKey.value = null;
  createSuccess.value = null;
  try {
    const result = await admin.createCompany({
      name: createForm.name,
      contactEmail: createForm.contactEmail || null,
      adminEmail: createForm.adminEmail,
    });
    createForm.name = '';
    createForm.contactEmail = '';
    createForm.adminEmail = '';
    closeForms();
    createSuccess.value = result.adminInvitation.email;
  } catch (err) {
    errorKey.value = extractApiError(err).messageKey;
  }
}

async function onEdit(): Promise<void> {
  if (!editingCompany.value) return;
  errorKey.value = null;
  try {
    await admin.updateCompany(editingCompany.value.id, {
      name: editForm.name,
      contactEmail: editForm.contactEmail || null,
      status: editForm.status,
    });
    closeForms();
  } catch (err) {
    errorKey.value = extractApiError(err).messageKey;
  }
}
</script>

<template>
  <AppLayout>
    <main class="page">
      <div class="page-header">
        <h1>{{ t('admin.companiesTitle') }}</h1>
        <button type="button" class="btn btn-primary" @click="openCreate">
          {{ t('admin.newCompany') }}
        </button>
      </div>

      <p v-if="errorKey" class="error-text">{{ t(errorKey) }}</p>
      <p v-if="createSuccess" class="success-text">
        {{ t('admin.adminInviteSent', { email: createSuccess }) }}
      </p>

      <form v-if="showCreateForm" class="form-card" @submit.prevent="onCreate">
        <h2>{{ t('admin.createCompany') }}</h2>
        <p class="hint">{{ t('admin.adminInviteHint') }}</p>
        <label>
          <span>{{ t('admin.companyName') }}</span>
          <input v-model="createForm.name" required minlength="2" />
        </label>
        <label>
          <span>{{ t('admin.contactEmail') }}</span>
          <input v-model="createForm.contactEmail" type="email" />
        </label>
        <label>
          <span>{{ t('admin.adminEmail') }}</span>
          <input v-model="createForm.adminEmail" type="email" required />
        </label>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" @click="closeForms">{{ t('items.cancel') }}</button>
          <button type="submit" class="btn btn-primary">{{ t('admin.createCompany') }}</button>
        </div>
      </form>

      <form v-if="editingCompany" class="form-card" @submit.prevent="onEdit">
        <h2>{{ t('admin.editCompany') }}</h2>
        <label>
          <span>{{ t('admin.companyName') }}</span>
          <input v-model="editForm.name" required minlength="2" />
        </label>
        <label>
          <span>{{ t('admin.contactEmail') }}</span>
          <input v-model="editForm.contactEmail" type="email" />
        </label>
        <label>
          <span>{{ t('admin.status') }}</span>
          <select v-model="editForm.status">
            <option value="ACTIVE">{{ t('admin.statuses.ACTIVE') }}</option>
            <option value="SUSPENDED">{{ t('admin.statuses.SUSPENDED') }}</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" @click="closeForms">{{ t('items.cancel') }}</button>
          <button type="submit" class="btn btn-primary">{{ t('admin.saveCompany') }}</button>
        </div>
      </form>

      <div v-if="admin.loading" class="empty-state">{{ t('app.loading') }}</div>

      <div v-else class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>{{ t('admin.companyName') }}</th>
            <th>{{ t('admin.contactEmail') }}</th>
            <th>{{ t('nav.users') }}</th>
            <th>{{ t('tickets.title') }}</th>
            <th>{{ t('admin.status') }}</th>
            <th>{{ t('items.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="company in admin.companies" :key="company.id">
            <td><strong>{{ company.name }}</strong></td>
            <td>{{ company.contact_email || '—' }}</td>
            <td>{{ company.users_count }}</td>
            <td>{{ company.open_tickets_count }}</td>
            <td>
              <span :class="`badge badge-${company.status.toLowerCase()}`">
                {{ t(`admin.statuses.${company.status}`) }}
              </span>
            </td>
            <td class="row-actions">
              <button type="button" class="btn btn-ghost btn-sm" @click="openEdit(company)">
                {{ t('items.edit') }}
              </button>
              <button
                type="button"
                class="btn btn-sm"
                :class="company.status === 'ACTIVE' ? 'btn-danger' : 'btn-primary'"
                @click="admin.toggleCompanyStatus(company)"
              >
                {{ company.status === 'ACTIVE' ? t('admin.suspend') : t('admin.activate') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </main>
  </AppLayout>
</template>

<style scoped>
.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.row-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.hint {
  color: var(--text-muted);
  font-size: 0.875rem;
  margin: 0 0 0.5rem;
}

.success-text {
  color: var(--success, #16a34a);
  margin-bottom: 1rem;
}
</style>
