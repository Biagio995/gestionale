<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CrmContact, DealPayload } from '@/types';

const props = defineProps<{
  contacts: CrmContact[];
  defaultContactId?: string | null;
}>();

const emit = defineEmits<{
  save: [payload: DealPayload];
  cancel: [];
}>();

const { t } = useI18n();

const contactId = ref<string | null>(null);
const title = ref('');
const value = ref(0);
const stage = ref<'LEAD' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST'>('LEAD');
const expectedCloseDate = ref('');
const notes = ref('');

watch(
  () => props.defaultContactId,
  (id) => {
    if (id) contactId.value = id;
  },
  { immediate: true },
);

function submit(): void {
  emit('save', {
    contactId: contactId.value,
    title: title.value.trim(),
    value: value.value,
    stage: stage.value,
    expectedCloseDate: expectedCloseDate.value || null,
    notes: notes.value || null,
  });
}
</script>

<template>
  <form class="card form-card" @submit.prevent="submit">
    <h2>{{ t('crm.deals.createTitle') }}</h2>

    <div class="form-grid">
      <div class="field full">
        <label>{{ t('crm.deals.title') }}</label>
        <input v-model="title" type="text" required />
      </div>
      <div class="field">
        <label>{{ t('crm.deals.contact') }}</label>
        <select v-model="contactId">
          <option :value="null">{{ t('crm.deals.noContact') }}</option>
          <option v-for="c in contacts" :key="c.id" :value="c.id">
            {{ c.first_name }} {{ c.last_name }}
            <template v-if="c.company_name"> — {{ c.company_name }}</template>
          </option>
        </select>
      </div>
      <div class="field">
        <label>{{ t('crm.deals.value') }}</label>
        <input v-model.number="value" type="number" min="0" step="0.01" required />
      </div>
      <div class="field">
        <label>{{ t('crm.deals.stage') }}</label>
        <select v-model="stage">
          <option value="LEAD">{{ t('crm.deals.stages.LEAD') }}</option>
          <option value="QUALIFIED">{{ t('crm.deals.stages.QUALIFIED') }}</option>
          <option value="PROPOSAL">{{ t('crm.deals.stages.PROPOSAL') }}</option>
          <option value="NEGOTIATION">{{ t('crm.deals.stages.NEGOTIATION') }}</option>
          <option value="WON">{{ t('crm.deals.stages.WON') }}</option>
          <option value="LOST">{{ t('crm.deals.stages.LOST') }}</option>
        </select>
      </div>
      <div class="field">
        <label>{{ t('crm.deals.expectedClose') }}</label>
        <input v-model="expectedCloseDate" type="date" />
      </div>
      <div class="field full">
        <label>{{ t('crm.deals.notes') }}</label>
        <textarea v-model="notes" rows="2" />
      </div>
    </div>

    <div class="form-actions">
      <button type="button" class="btn btn-ghost" @click="emit('cancel')">{{ t('crm.cancel') }}</button>
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
