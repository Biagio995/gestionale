<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CalendarEvent, CalendarEventPayload, Company, CrmContact } from '@/types';
import { defaultSlotForDay, localInputToIso, toLocalDatetimeInput } from './calendarUtils';

const props = defineProps<{
  event?: CalendarEvent | null;
  initialDay?: Date | null;
  contacts?: CrmContact[];
  companies?: Company[];
  isPlatform?: boolean;
}>();

const emit = defineEmits<{
  save: [payload: CalendarEventPayload];
  cancel: [];
  delete: [];
}>();

const { t } = useI18n();

const title = ref('');
const description = ref('');
const eventType = ref<'CALL' | 'MEETING' | 'APPOINTMENT'>('MEETING');
const startsAt = ref('');
const endsAt = ref('');
const allDay = ref(false);
const location = ref('');
const contactId = ref<string | null>(null);
const targetTenantId = ref('');

watch(
  () => [props.event, props.initialDay] as const,
  ([ev, day]) => {
    if (ev) {
      title.value = ev.title;
      description.value = ev.description ?? '';
      eventType.value = ev.event_type;
      startsAt.value = toLocalDatetimeInput(new Date(ev.starts_at));
      endsAt.value = toLocalDatetimeInput(new Date(ev.ends_at));
      allDay.value = ev.all_day;
      location.value = ev.location ?? '';
      contactId.value = ev.contact_id;
      targetTenantId.value = ev.target_tenant_id ?? '';
    } else if (day) {
      const slot = defaultSlotForDay(day);
      startsAt.value = slot.start;
      endsAt.value = slot.end;
      title.value = '';
      description.value = '';
      eventType.value = 'MEETING';
      allDay.value = false;
      location.value = '';
      contactId.value = null;
      targetTenantId.value = props.companies?.[0]?.id ?? '';
    }
  },
  { immediate: true },
);

function submit(): void {
  const payload: CalendarEventPayload = {
    title: title.value.trim(),
    description: description.value || null,
    eventType: eventType.value,
    startsAt: localInputToIso(startsAt.value),
    endsAt: localInputToIso(endsAt.value),
    allDay: allDay.value,
    location: location.value || null,
    contactId: props.isPlatform ? null : contactId.value,
    targetTenantId: props.isPlatform ? targetTenantId.value || null : null,
  };
  emit('save', payload);
}
</script>

<template>
  <form class="card event-form" @submit.prevent="submit">
    <h2>
      {{ event ? t('calendar.editTitle') : t('calendar.createTitle') }}
    </h2>

    <div class="form-grid">
      <div v-if="isPlatform" class="field full">
        <label>{{ t('calendar.company') }}</label>
        <select v-model="targetTenantId" required>
          <option value="" disabled>{{ t('calendar.selectCompany') }}</option>
          <option v-for="company in companies" :key="company.id" :value="company.id">
            {{ company.name }}
          </option>
        </select>
      </div>
      <div class="field full">
        <label>{{ t('calendar.eventTitle') }}</label>
        <input v-model="title" type="text" required />
      </div>
      <div class="field">
        <label>{{ t('calendar.type') }}</label>
        <select v-model="eventType">
          <option value="CALL">{{ t('calendar.types.CALL') }}</option>
          <option value="MEETING">{{ t('calendar.types.MEETING') }}</option>
          <option value="APPOINTMENT">{{ t('calendar.types.APPOINTMENT') }}</option>
        </select>
      </div>
      <div class="field checkbox-field">
        <label>
          <input v-model="allDay" type="checkbox" />
          {{ t('calendar.allDay') }}
        </label>
      </div>
      <div class="field">
        <label>{{ t('calendar.startsAt') }}</label>
        <input v-model="startsAt" type="datetime-local" required />
      </div>
      <div class="field">
        <label>{{ t('calendar.endsAt') }}</label>
        <input v-model="endsAt" type="datetime-local" required />
      </div>
      <div class="field">
        <label>{{ t('calendar.location') }}</label>
        <input v-model="location" type="text" />
      </div>
      <div v-if="!isPlatform" class="field">
        <label>{{ t('calendar.contact') }}</label>
        <select v-model="contactId">
          <option :value="null">{{ t('calendar.noContact') }}</option>
          <option v-for="c in contacts" :key="c.id" :value="c.id">
            {{ c.first_name }} {{ c.last_name }}
            <template v-if="c.company_name"> — {{ c.company_name }}</template>
          </option>
        </select>
      </div>
      <div class="field full">
        <label>{{ t('calendar.description') }}</label>
        <textarea v-model="description" rows="3" />
      </div>
    </div>

    <div class="form-actions">
      <button
        v-if="event"
        type="button"
        class="btn btn-danger"
        @click="emit('delete')"
      >
        {{ t('calendar.delete') }}
      </button>
      <div class="spacer" />
      <button type="button" class="btn btn-ghost" @click="emit('cancel')">
        {{ t('calendar.cancel') }}
      </button>
      <button type="submit" class="btn btn-primary">{{ t('calendar.save') }}</button>
    </div>
  </form>
</template>

<style scoped>
.event-form {
  margin-bottom: 1.5rem;
  padding: 1.25rem;
}

.event-form h2 {
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

.checkbox-field {
  justify-content: flex-end;
}

.checkbox-field label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
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
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.spacer {
  flex: 1;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
