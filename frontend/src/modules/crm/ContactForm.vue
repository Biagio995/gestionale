<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ContactPayload, CrmContact } from '@/types';

const props = defineProps<{
  contact?: CrmContact | null;
}>();

const emit = defineEmits<{
  save: [payload: ContactPayload];
  cancel: [];
}>();

const { t } = useI18n();

const companyName = ref('');
const firstName = ref('');
const lastName = ref('');
const email = ref('');
const phone = ref('');
const jobTitle = ref('');
const status = ref<'LEAD' | 'CUSTOMER' | 'INACTIVE'>('LEAD');
const notes = ref('');
const vatNumber = ref('');
const taxCode = ref('');
const sdiCode = ref('');
const pecEmail = ref('');
const address = ref('');

watch(
  () => props.contact,
  (c) => {
    companyName.value = c?.company_name ?? '';
    firstName.value = c?.first_name ?? '';
    lastName.value = c?.last_name ?? '';
    email.value = c?.email ?? '';
    phone.value = c?.phone ?? '';
    jobTitle.value = c?.job_title ?? '';
    status.value = c?.status ?? 'LEAD';
    notes.value = c?.notes ?? '';
    vatNumber.value = c?.vat_number ?? '';
    taxCode.value = c?.tax_code ?? '';
    sdiCode.value = c?.sdi_code ?? '';
    pecEmail.value = c?.pec_email ?? '';
    address.value = c?.address ?? '';
  },
  { immediate: true },
);

function submit(): void {
  emit('save', {
    companyName: companyName.value || null,
    firstName: firstName.value.trim(),
    lastName: lastName.value.trim(),
    email: email.value || null,
    phone: phone.value || null,
    jobTitle: jobTitle.value || null,
    status: status.value,
    notes: notes.value || null,
    vatNumber: vatNumber.value.trim() || null,
    taxCode: taxCode.value.trim() || null,
    sdiCode: sdiCode.value.trim().toUpperCase() || null,
    pecEmail: pecEmail.value.trim() || null,
    address: address.value.trim() || null,
  });
}
</script>

<template>
  <form class="card form-card" @submit.prevent="submit">
    <h2>{{ contact ? t('crm.contacts.editTitle') : t('crm.contacts.createTitle') }}</h2>

    <div class="form-grid">
      <div class="field">
        <label>{{ t('crm.contacts.firstName') }}</label>
        <input v-model="firstName" type="text" required />
      </div>
      <div class="field">
        <label>{{ t('crm.contacts.lastName') }}</label>
        <input v-model="lastName" type="text" required />
      </div>
      <div class="field">
        <label>{{ t('crm.contacts.company') }}</label>
        <input v-model="companyName" type="text" />
      </div>
      <div class="field">
        <label>{{ t('crm.contacts.jobTitle') }}</label>
        <input v-model="jobTitle" type="text" />
      </div>
      <div class="field">
        <label>{{ t('crm.contacts.email') }}</label>
        <input v-model="email" type="email" />
      </div>
      <div class="field">
        <label>{{ t('crm.contacts.phone') }}</label>
        <input v-model="phone" type="tel" />
      </div>
      <div class="field">
        <label>{{ t('sales.customer.vat') }}</label>
        <input v-model="vatNumber" type="text" />
      </div>
      <div class="field">
        <label>{{ t('sales.customer.taxCode') }}</label>
        <input v-model="taxCode" type="text" />
      </div>
      <div class="field">
        <label>{{ t('fiscal.settings.sdiCode') }}</label>
        <input v-model="sdiCode" type="text" maxlength="7" />
      </div>
      <div class="field">
        <label>{{ t('fiscal.settings.pecEmail') }}</label>
        <input v-model="pecEmail" type="email" />
      </div>
      <div class="field full">
        <label>{{ t('sales.customer.address') }}</label>
        <input v-model="address" type="text" />
      </div>
      <div class="field">
        <label>{{ t('crm.contacts.status') }}</label>
        <select v-model="status">
          <option value="LEAD">{{ t('crm.contacts.statuses.LEAD') }}</option>
          <option value="CUSTOMER">{{ t('crm.contacts.statuses.CUSTOMER') }}</option>
          <option value="INACTIVE">{{ t('crm.contacts.statuses.INACTIVE') }}</option>
        </select>
      </div>
      <div class="field full">
        <label>{{ t('crm.contacts.notes') }}</label>
        <textarea v-model="notes" rows="3" />
      </div>
    </div>

    <div class="form-actions">
      <button type="button" class="btn btn-ghost" @click="emit('cancel')">
        {{ t('crm.cancel') }}
      </button>
      <button type="submit" class="btn btn-primary">{{ t('crm.save') }}</button>
    </div>
  </form>
</template>

<style scoped>
.form-card {
  margin-bottom: 1.5rem;
  padding: 1.25rem;
}

.form-card h2 {
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field.full {
  grid-column: 1 / -1;
}

.field label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.field input,
.field select,
.field textarea {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font: inherit;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
