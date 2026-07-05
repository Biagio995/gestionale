import { api } from './api';
import type { CalendarEvent, CalendarEventPayload } from '@/types';

export async function fetchCalendarEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const { data } = await api.get<CalendarEvent[]>('/calendar/events', { params: { from, to } });
  return data;
}

export async function createCalendarEvent(payload: CalendarEventPayload): Promise<CalendarEvent> {
  const { data } = await api.post<CalendarEvent>('/calendar/events', payload);
  return data;
}

export async function updateCalendarEvent(
  id: string,
  payload: Partial<CalendarEventPayload>,
): Promise<CalendarEvent> {
  const { data } = await api.put<CalendarEvent>(`/calendar/events/${id}`, payload);
  return data;
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await api.delete(`/calendar/events/${id}`);
}
