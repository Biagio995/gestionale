import { z } from 'zod';
import { isPlatformTenant } from '../../config/platform.js';
import type { RequestContext } from '../../types/index.js';
import { badRequest, forbidden, notFound } from '../../utils/errors.js';
import * as calendarRepo from './calendar.repository.js';
import type { CalendarEvent, CalendarEventType } from './calendar.repository.js';

const eventTypes = ['CALL', 'MEETING', 'APPOINTMENT'] as const;

const eventBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  eventType: z.enum(eventTypes),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  allDay: z.boolean().optional(),
  location: z.string().max(300).optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  companyName: z.string().max(200).optional().nullable(),
  targetTenantId: z.string().uuid().optional().nullable(),
  ownerId: z.string().uuid().optional(),
});

const eventUpdateSchema = eventBodySchema.partial();

export type PublicCalendarEvent = CalendarEvent & { shared_from_platform: boolean };

function enrichEvent(event: CalendarEvent, viewerTenantId: string): PublicCalendarEvent {
  return {
    ...event,
    shared_from_platform:
      !isPlatformTenant(viewerTenantId) && isPlatformTenant(event.tenant_id),
  };
}

function parseRange(query: Record<string, unknown>): { from: Date; to: Date } {
  const fromRaw = typeof query.from === 'string' ? query.from : null;
  const toRaw = typeof query.to === 'string' ? query.to : null;
  if (!fromRaw || !toRaw) {
    throw badRequest('errors.validation');
  }
  const from = new Date(fromRaw);
  const to = new Date(toRaw);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    throw badRequest('errors.validation');
  }
  return { from, to };
}

async function validateContactLink(
  context: RequestContext,
  contactId: string | null | undefined,
): Promise<void> {
  if (!contactId) return;
  if (isPlatformTenant(context.tenantId)) {
    throw badRequest('errors.validation');
  }
  const ok = await calendarRepo.contactBelongsToTenant(contactId, context.tenantId);
  if (!ok) {
    throw notFound('errors.contactNotFound');
  }
}

async function resolveTargetTenant(
  targetTenantId: string | null | undefined,
): Promise<{ id: string; name: string } | null> {
  if (!targetTenantId) return null;
  const client = await calendarRepo.findClientTenantById(targetTenantId);
  if (!client) throw notFound('errors.tenantNotFound');
  return client;
}

function assertCanMutateEvent(event: CalendarEvent, context: RequestContext): void {
  if (!isPlatformTenant(context.tenantId) && isPlatformTenant(event.tenant_id)) {
    throw forbidden('errors.calendarPlatformEventReadOnly');
  }
}

export async function listEvents(
  context: RequestContext,
  query: Record<string, unknown>,
): Promise<PublicCalendarEvent[]> {
  const { from, to } = parseRange(query);
  const events = await calendarRepo.findEventsByTenantAndRange(context.tenantId, from, to);
  return events.map((event) => enrichEvent(event, context.tenantId));
}

export async function getEvent(
  context: RequestContext,
  eventId: string,
): Promise<PublicCalendarEvent> {
  const event = await calendarRepo.findEventByIdAndTenant(eventId, context.tenantId);
  if (!event) throw notFound('errors.eventNotFound');
  return enrichEvent(event, context.tenantId);
}

export async function createEvent(
  context: RequestContext,
  body: unknown,
): Promise<PublicCalendarEvent> {
  const input = eventBodySchema.parse(body);
  await validateContactLink(context, input.contactId);

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (endsAt <= startsAt) {
    throw badRequest('errors.validation');
  }

  let targetTenantId: string | null = null;
  let companyName = input.companyName ?? null;

  if (isPlatformTenant(context.tenantId)) {
    if (!input.targetTenantId) {
      throw badRequest('errors.calendarCompanyRequired');
    }
    const client = await resolveTargetTenant(input.targetTenantId);
    targetTenantId = client!.id;
    companyName = client!.name;
  }

  const event = await calendarRepo.createEvent({
    tenantId: context.tenantId,
    createdBy: context.userId,
    ownerId: input.ownerId ?? context.userId,
    title: input.title,
    description: input.description,
    eventType: input.eventType,
    startsAt,
    endsAt,
    allDay: input.allDay,
    location: input.location,
    contactId: isPlatformTenant(context.tenantId) ? null : (input.contactId ?? null),
    companyName,
    targetTenantId,
  });
  return enrichEvent(event, context.tenantId);
}

export async function updateEvent(
  context: RequestContext,
  eventId: string,
  body: unknown,
): Promise<PublicCalendarEvent> {
  const existing = await calendarRepo.findEventByIdAndTenant(eventId, context.tenantId);
  if (!existing) throw notFound('errors.eventNotFound');
  assertCanMutateEvent(existing, context);

  const input = eventUpdateSchema.parse(body);
  if (input.contactId) {
    await validateContactLink(context, input.contactId);
  }

  const startsAt = input.startsAt ? new Date(input.startsAt) : undefined;
  const endsAt = input.endsAt ? new Date(input.endsAt) : undefined;
  if (startsAt && endsAt && endsAt <= startsAt) {
    throw badRequest('errors.validation');
  }

  let targetTenantId: string | null | undefined;
  let companyName = input.companyName;

  if (isPlatformTenant(context.tenantId)) {
    if (input.targetTenantId !== undefined) {
      if (!input.targetTenantId) {
        throw badRequest('errors.calendarCompanyRequired');
      }
      const client = await resolveTargetTenant(input.targetTenantId);
      targetTenantId = client!.id;
      companyName = client!.name;
    }
  }

  const event = await calendarRepo.updateEvent({
    eventId,
    tenantId: context.tenantId,
    ownerId: input.ownerId,
    title: input.title,
    description: input.description,
    eventType: input.eventType as CalendarEventType | undefined,
    startsAt,
    endsAt,
    allDay: input.allDay,
    location: input.location,
    contactId: isPlatformTenant(context.tenantId) ? null : input.contactId,
    companyName,
    targetTenantId,
  });
  if (!event) throw notFound('errors.eventNotFound');
  return enrichEvent(event, context.tenantId);
}

export async function deleteEvent(context: RequestContext, eventId: string): Promise<void> {
  const existing = await calendarRepo.findEventByIdAndTenant(eventId, context.tenantId);
  if (!existing) throw notFound('errors.eventNotFound');
  assertCanMutateEvent(existing, context);

  const ok = await calendarRepo.softDeleteEvent(eventId, context.tenantId);
  if (!ok) throw notFound('errors.eventNotFound');
}
