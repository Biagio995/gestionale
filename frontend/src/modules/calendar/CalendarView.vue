<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/components/AppLayout.vue';
import EventForm from './EventForm.vue';
import * as calendarService from '@/services/calendarService';
import * as crmService from '@/services/crmService';
import { useAdminStore } from '@/stores/admin';
import { extractApiError } from '@/services/api';
import type { CalendarEvent, CalendarEventPayload, CrmContact } from '@/types';
import {
  addMonths,
  buildMonthGrid,
  eventDayKeys,
  formatEventTime,
  monthRangeIso,
} from './calendarUtils';

const props = defineProps<{
  platform?: boolean;
}>();

const { t, locale } = useI18n();
const admin = useAdminStore();

const viewDate = ref(startOfTodayMonth());
const events = ref<CalendarEvent[]>([]);
const contacts = ref<CrmContact[]>([]);
const loading = ref(true);
const actionError = ref<string | null>(null);
const showForm = ref(false);
const editingEvent = ref<CalendarEvent | null>(null);
const selectedDay = ref<Date | null>(null);
const selectedEventId = ref<string | null>(null);

const weekdayLabels = computed(() => {
  const base = new Date(2026, 0, 5);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(d);
  });
});

const monthLabel = computed(() =>
  new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(viewDate.value),
);

const monthDays = computed(() => buildMonthGrid(viewDate.value));

const eventsByDay = computed(() => {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events.value) {
    for (const key of eventDayKeys(event)) {
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
  }
  for (const [, list] of map) {
    list.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }
  return map;
});

const upcomingEvents = computed(() => {
  const now = new Date();
  return [...events.value]
    .filter((e) => new Date(e.ends_at) >= now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 8);
});

const selectedEvent = computed(() =>
  events.value.find((e) => e.id === selectedEventId.value) ?? null,
);

function startOfTodayMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

onMounted(async () => {
  if (props.platform) {
    try {
      await admin.loadCompanies();
    } catch {
      /* optional */
    }
  } else {
    try {
      contacts.value = await crmService.fetchContacts();
    } catch {
      /* optional for calendar */
    }
  }
  await loadEvents();
});

watch(viewDate, loadEvents);

async function loadEvents(): Promise<void> {
  loading.value = true;
  actionError.value = null;
  try {
    const range = monthRangeIso(viewDate.value);
    events.value = await calendarService.fetchCalendarEvents(range.from, range.to);
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    loading.value = false;
  }
}

function prevMonth(): void {
  viewDate.value = addMonths(viewDate.value, -1);
}

function nextMonth(): void {
  viewDate.value = addMonths(viewDate.value, 1);
}

function goToday(): void {
  viewDate.value = startOfTodayMonth();
}

function openCreate(day: Date): void {
  editingEvent.value = null;
  selectedDay.value = day;
  selectedEventId.value = null;
  showForm.value = true;
}

function openEdit(event: CalendarEvent): void {
  selectedEventId.value = event.id;
  if (!props.platform && event.shared_from_platform) {
    showForm.value = false;
    editingEvent.value = null;
    selectedDay.value = null;
    return;
  }
  editingEvent.value = event;
  selectedDay.value = null;
  showForm.value = true;
}

function closeForm(): void {
  showForm.value = false;
  editingEvent.value = null;
  selectedDay.value = null;
}

async function onSave(payload: CalendarEventPayload): Promise<void> {
  actionError.value = null;
  try {
    if (editingEvent.value) {
      await calendarService.updateCalendarEvent(editingEvent.value.id, payload);
    } else {
      await calendarService.createCalendarEvent(payload);
    }
    closeForm();
    await loadEvents();
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  }
}

async function onDelete(): Promise<void> {
  if (!editingEvent.value || !confirm(t('calendar.confirmDelete'))) return;
  actionError.value = null;
  try {
    await calendarService.deleteCalendarEvent(editingEvent.value.id);
    closeForm();
    selectedEventId.value = null;
    await loadEvents();
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  }
}

function eventsForDay(key: string): CalendarEvent[] {
  return eventsByDay.value.get(key) ?? [];
}

function eventTypeClass(type: CalendarEvent['event_type']): string {
  return type.toLowerCase();
}
</script>

<template>
  <AppLayout>
    <main class="page page-wide">
      <div class="page-header">
        <div>
          <h1>{{ platform ? t('calendar.platformTitle') : t('calendar.title') }}</h1>
          <p class="subtitle">{{ platform ? t('calendar.platformSubtitle') : t('calendar.subtitle') }}</p>
        </div>
        <button type="button" class="btn btn-primary" @click="openCreate(new Date())">
          {{ t('calendar.newEvent') }}
        </button>
      </div>

      <p v-if="actionError" class="error">{{ t(actionError) }}</p>

      <EventForm
        v-if="showForm"
        :event="editingEvent"
        :initial-day="selectedDay"
        :contacts="contacts"
        :companies="admin.companies"
        :is-platform="platform"
        @save="onSave"
        @cancel="closeForm"
        @delete="onDelete"
      />

      <div class="calendar-layout">
        <section class="card calendar-panel">
          <div class="calendar-toolbar">
            <button type="button" class="btn btn-ghost" @click="prevMonth">‹</button>
            <h2>{{ monthLabel }}</h2>
            <button type="button" class="btn btn-ghost" @click="nextMonth">›</button>
            <button type="button" class="btn btn-secondary btn-today" @click="goToday">
              {{ t('calendar.today') }}
            </button>
          </div>

          <div v-if="loading" class="loading">{{ t('app.loading') }}</div>

          <div v-else class="month-grid">
            <div v-for="label in weekdayLabels" :key="label" class="weekday">{{ label }}</div>
            <button
              v-for="day in monthDays"
              :key="day.key"
              type="button"
              class="day-cell"
              :class="{ muted: !day.inMonth, today: day.isToday, selected: selectedEventId && eventsForDay(day.key).some((e) => e.id === selectedEventId) }"
              @click="openCreate(day.date)"
            >
              <span class="day-num">{{ day.date.getDate() }}</span>
              <div class="day-events">
                <div
                  v-for="event in eventsForDay(day.key).slice(0, 3)"
                  :key="event.id"
                  class="event-pill"
                  :class="[eventTypeClass(event.event_type), { 'event-pill-platform': event.shared_from_platform }]"
                  @click.stop="openEdit(event)"
                >
                  <span class="pill-time" v-if="!event.all_day">{{ formatEventTime(event).split(' – ')[0] }}</span>
                  {{ event.title }}
                </div>
                <span v-if="eventsForDay(day.key).length > 3" class="more">
                  +{{ eventsForDay(day.key).length - 3 }}
                </span>
              </div>
            </button>
          </div>
        </section>

        <aside class="card upcoming-panel">
          <h2>{{ t('calendar.upcoming') }}</h2>
          <div v-if="!upcomingEvents.length" class="mini-empty">{{ t('calendar.empty') }}</div>
          <ul v-else class="upcoming-list">
            <li
              v-for="event in upcomingEvents"
              :key="event.id"
              :class="{ active: selectedEvent?.id === event.id }"
              @click="openEdit(event)"
            >
              <div class="upcoming-meta">
                <span class="type-badge" :class="eventTypeClass(event.event_type)">
                  {{ t(`calendar.types.${event.event_type}`) }}
                </span>
                <span class="upcoming-date">
                  {{ new Date(event.starts_at).toLocaleDateString(locale) }}
                </span>
              </div>
              <strong>{{ event.title }}</strong>
              <p v-if="event.shared_from_platform" class="upcoming-extra platform-badge">
                {{ t('calendar.scheduledByPlatform') }}
              </p>
              <p v-if="!event.all_day" class="upcoming-time">{{ formatEventTime(event) }}</p>
              <p v-if="event.contact_name || event.target_tenant_name || event.company_name" class="upcoming-extra">
                {{ event.contact_name || event.target_tenant_name || event.company_name }}
              </p>
              <p v-if="event.location" class="upcoming-extra">{{ event.location }}</p>
            </li>
          </ul>

          <div v-if="selectedEvent?.shared_from_platform" class="platform-detail">
            <h3>{{ selectedEvent.title }}</h3>
            <p class="platform-badge">{{ t('calendar.scheduledByPlatform') }}</p>
            <p v-if="!selectedEvent.all_day" class="upcoming-time">{{ formatEventTime(selectedEvent) }}</p>
            <p v-if="selectedEvent.location" class="upcoming-extra">{{ selectedEvent.location }}</p>
            <p v-if="selectedEvent.description" class="upcoming-extra">{{ selectedEvent.description }}</p>
            <p class="read-only-hint">{{ t('calendar.platformEventReadOnly') }}</p>
          </div>
        </aside>
      </div>
    </main>
  </AppLayout>
</template>

<style scoped>
.page-wide {
  max-width: 1280px;
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.error {
  color: var(--danger);
  margin-bottom: 1rem;
}

.calendar-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 1rem;
  align-items: start;
}

.calendar-panel {
  padding: 1rem;
}

.calendar-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.calendar-toolbar h2 {
  flex: 1;
  text-align: center;
  font-size: 1.1rem;
  text-transform: capitalize;
}

.btn-today {
  margin-left: auto;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.weekday {
  background: var(--bg);
  padding: 0.5rem;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
}

.day-cell {
  background: var(--surface);
  border: none;
  min-height: 110px;
  padding: 0.375rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.day-cell:hover {
  background: var(--primary-light);
}

.day-cell.muted {
  opacity: 0.45;
}

.day-cell.today .day-num {
  background: var(--primary);
  color: #fff;
  border-radius: 999px;
  width: 1.5rem;
  height: 1.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.day-num {
  font-size: 0.8rem;
  font-weight: 600;
}

.day-events {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.event-pill {
  font-size: 0.68rem;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #fff;
}

.event-pill.call {
  background: #2563eb;
}

.event-pill.meeting {
  background: #7c3aed;
}

.event-pill.appointment {
  background: #059669;
}

.pill-time {
  opacity: 0.9;
  margin-right: 0.25rem;
}

.more {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.upcoming-panel {
  padding: 1rem;
  position: sticky;
  top: 1rem;
}

.upcoming-panel h2 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

.mini-empty {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.upcoming-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.upcoming-list li {
  padding: 0.625rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
}

.upcoming-list li:hover,
.upcoming-list li.active {
  border-color: var(--primary);
  background: var(--primary-light);
}

.upcoming-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
}

.type-badge {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.type-badge.call { color: #2563eb; }
.type-badge.meeting { color: #7c3aed; }
.type-badge.appointment { color: #059669; }

.upcoming-date {
  color: var(--text-muted);
}

.upcoming-time,
.upcoming-extra {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.125rem;
}

.event-pill-platform {
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.45);
}

.platform-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
}

.platform-detail {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.platform-detail h3 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.read-only-hint {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
}

@media (max-width: 960px) {
  .calendar-layout {
    grid-template-columns: 1fr;
  }

  .upcoming-panel {
    position: static;
  }

  .day-cell {
    min-height: 80px;
  }
}
</style>
