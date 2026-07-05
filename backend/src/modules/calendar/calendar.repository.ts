import { pool } from '../../db/pool.js';
import { PLATFORM_TENANT_ID } from '../../config/platform.js';

export type CalendarEventType = 'CALL' | 'MEETING' | 'APPOINTMENT';

export interface CalendarEvent {
  id: string;
  tenant_id: string;
  created_by: string;
  owner_id: string;
  title: string;
  description: string | null;
  event_type: CalendarEventType;
  starts_at: Date;
  ends_at: Date;
  all_day: boolean;
  location: string | null;
  contact_id: string | null;
  company_name: string | null;
  target_tenant_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  owner_email?: string;
  contact_name?: string;
  target_tenant_name?: string | null;
}

const eventSelect = `
  SELECT e.*,
         u.email AS owner_email,
         NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), '') AS contact_name,
         tgt.name AS target_tenant_name
  FROM calendar_events e
  JOIN users u ON u.id = e.owner_id
  LEFT JOIN crm_contacts c ON c.id = e.contact_id AND c.deleted_at IS NULL
  LEFT JOIN tenants tgt ON tgt.id = e.target_tenant_id
`;

function clientVisibilitySql(tenantParam: string, platformParam: string): string {
  return `(e.tenant_id = ${tenantParam} OR (e.tenant_id = ${platformParam} AND e.target_tenant_id = ${tenantParam}))`;
}

export async function findEventsByTenantAndRange(
  tenantId: string,
  from: Date,
  to: Date,
): Promise<CalendarEvent[]> {
  const result = await pool.query<CalendarEvent>(
    `${eventSelect}
     WHERE e.deleted_at IS NULL
       AND e.starts_at < $3
       AND e.ends_at > $2
       AND ${clientVisibilitySql('$1', '$4')}
     ORDER BY e.starts_at ASC`,
    [tenantId, from, to, PLATFORM_TENANT_ID],
  );
  return result.rows;
}

export async function findEventByIdAndTenant(
  eventId: string,
  tenantId: string,
): Promise<CalendarEvent | null> {
  const result = await pool.query<CalendarEvent>(
    `${eventSelect}
     WHERE e.id = $1
       AND e.deleted_at IS NULL
       AND ${clientVisibilitySql('$2', '$3')}`,
    [eventId, tenantId, PLATFORM_TENANT_ID],
  );
  return result.rows[0] ?? null;
}

export async function findClientTenantById(
  tenantId: string,
): Promise<{ id: string; name: string } | null> {
  const result = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM tenants WHERE id = $1 AND id != $2`,
    [tenantId, PLATFORM_TENANT_ID],
  );
  return result.rows[0] ?? null;
}

export async function createEvent(input: {
  tenantId: string;
  createdBy: string;
  ownerId: string;
  title: string;
  description?: string | null;
  eventType: CalendarEventType;
  startsAt: Date;
  endsAt: Date;
  allDay?: boolean;
  location?: string | null;
  contactId?: string | null;
  companyName?: string | null;
  targetTenantId?: string | null;
}): Promise<CalendarEvent> {
  const result = await pool.query<CalendarEvent>(
    `INSERT INTO calendar_events (
       tenant_id, created_by, owner_id, title, description, event_type,
       starts_at, ends_at, all_day, location, contact_id, company_name, target_tenant_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      input.tenantId,
      input.createdBy,
      input.ownerId,
      input.title,
      input.description ?? null,
      input.eventType,
      input.startsAt,
      input.endsAt,
      input.allDay ?? false,
      input.location ?? null,
      input.contactId ?? null,
      input.companyName ?? null,
      input.targetTenantId ?? null,
    ],
  );
  const created = await findEventByIdAndTenant(result.rows[0]!.id, input.tenantId);
  return created!;
}

export async function updateEvent(input: {
  eventId: string;
  tenantId: string;
  ownerId?: string;
  title?: string;
  description?: string | null;
  eventType?: CalendarEventType;
  startsAt?: Date;
  endsAt?: Date;
  allDay?: boolean;
  location?: string | null;
  contactId?: string | null;
  companyName?: string | null;
  targetTenantId?: string | null;
}): Promise<CalendarEvent | null> {
  const result = await pool.query(
    `UPDATE calendar_events SET
       owner_id = COALESCE($3, owner_id),
       title = COALESCE($4, title),
       description = COALESCE($5, description),
       event_type = COALESCE($6, event_type),
       starts_at = COALESCE($7, starts_at),
       ends_at = COALESCE($8, ends_at),
       all_day = COALESCE($9, all_day),
       location = COALESCE($10, location),
       contact_id = COALESCE($11, contact_id),
       company_name = COALESCE($12, company_name),
       target_tenant_id = COALESCE($13, target_tenant_id),
       updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [
      input.eventId,
      input.tenantId,
      input.ownerId,
      input.title,
      input.description,
      input.eventType,
      input.startsAt,
      input.endsAt,
      input.allDay,
      input.location,
      input.contactId,
      input.companyName,
      input.targetTenantId,
    ],
  );
  if ((result.rowCount ?? 0) === 0) return null;
  return findEventByIdAndTenant(input.eventId, input.tenantId);
}

export async function softDeleteEvent(eventId: string, tenantId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE calendar_events SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [eventId, tenantId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function contactBelongsToTenant(
  contactId: string,
  tenantId: string,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM crm_contacts WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [contactId, tenantId],
  );
  return (result.rowCount ?? 0) > 0;
}
