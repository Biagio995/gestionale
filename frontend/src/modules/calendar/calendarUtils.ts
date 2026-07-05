export interface CalendarDay {
  date: Date;
  key: string;
  inMonth: boolean;
  isToday: boolean;
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function buildMonthGrid(viewDate: Date): CalendarDay[] {
  const todayKey = toDateKey(new Date());
  const first = startOfMonth(viewDate);
  const start = new Date(first);
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = toDateKey(date);
    days.push({
      date,
      key,
      inMonth: date.getMonth() === viewDate.getMonth(),
      isToday: key === todayKey,
    });
  }
  return days;
}

export function monthRangeIso(viewDate: Date): { from: string; to: string } {
  const grid = buildMonthGrid(viewDate);
  const from = new Date(grid[0]!.date);
  from.setHours(0, 0, 0, 0);
  const to = new Date(grid[grid.length - 1]!.date);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function eventDayKeys(event: { starts_at: string; ends_at: string }): string[] {
  const keys: string[] = [];
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= last) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export function defaultSlotForDay(day: Date): { start: string; end: string } {
  const start = new Date(day);
  start.setHours(10, 0, 0, 0);
  const end = new Date(day);
  end.setHours(11, 0, 0, 0);
  return {
    start: toLocalDatetimeInput(start),
    end: toLocalDatetimeInput(end),
  };
}

export function toLocalDatetimeInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function localInputToIso(value: string): string {
  return new Date(value).toISOString();
}

export function formatEventTime(event: {
  starts_at: string;
  ends_at: string;
  all_day: boolean;
}): string {
  if (event.all_day) return '';
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  return `${start.toLocaleTimeString(undefined, opts)} – ${end.toLocaleTimeString(undefined, opts)}`;
}
