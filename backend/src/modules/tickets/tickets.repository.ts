import { pool } from '../../db/pool.js';
import { PLATFORM_TENANT_ID } from '../../config/platform.js';
import type {
  SupportTicket,
  SupportTicketWithMeta,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from '../../types/index.js';

export async function findTicketsByTenant(tenantId: string): Promise<SupportTicketWithMeta[]> {
  const result = await pool.query<SupportTicketWithMeta>(
    `SELECT st.*, u.email AS author_email,
            (SELECT COUNT(*)::int FROM ticket_messages tm WHERE tm.ticket_id = st.id) AS messages_count
     FROM support_tickets st
     JOIN users u ON u.id = st.created_by
     WHERE st.tenant_id = $1
     ORDER BY st.created_at DESC`,
    [tenantId],
  );
  return result.rows;
}

export async function findAllTickets(filters?: {
  status?: TicketStatus;
  unreadOnly?: boolean;
}): Promise<SupportTicketWithMeta[]> {
  const conditions = [`t.id != $1`];
  const params: unknown[] = [PLATFORM_TENANT_ID];
  let idx = 2;

  if (filters?.status) {
    conditions.push(`st.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters?.unreadOnly) {
    conditions.push(`st.unread_by_staff = TRUE`);
  }

  const result = await pool.query<SupportTicketWithMeta>(
    `SELECT st.*, t.name AS tenant_name, u.email AS author_email,
            (SELECT COUNT(*)::int FROM ticket_messages tm WHERE tm.ticket_id = st.id) AS messages_count
     FROM support_tickets st
     JOIN tenants t ON t.id = st.tenant_id
     JOIN users u ON u.id = st.created_by
     WHERE ${conditions.join(' AND ')}
     ORDER BY
       st.unread_by_staff DESC,
       CASE st.priority
         WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4
       END,
       st.created_at DESC`,
    params,
  );
  return result.rows;
}

export async function findTicketByIdAndTenant(
  ticketId: string,
  tenantId: string,
): Promise<SupportTicketWithMeta | null> {
  const result = await pool.query<SupportTicketWithMeta>(
    `SELECT st.*, u.email AS author_email
     FROM support_tickets st
     JOIN users u ON u.id = st.created_by
     WHERE st.id = $1 AND st.tenant_id = $2`,
    [ticketId, tenantId],
  );
  return result.rows[0] ?? null;
}

export async function findTicketByIdForAdmin(
  ticketId: string,
): Promise<SupportTicketWithMeta | null> {
  const result = await pool.query<SupportTicketWithMeta>(
    `SELECT st.*, t.name AS tenant_name, u.email AS author_email
     FROM support_tickets st
     JOIN tenants t ON t.id = st.tenant_id
     JOIN users u ON u.id = st.created_by
     WHERE st.id = $1 AND t.id != $2`,
    [ticketId, PLATFORM_TENANT_ID],
  );
  return result.rows[0] ?? null;
}

export interface CreateTicketInput {
  tenantId: string;
  createdBy: string;
  contactEmail: string;
  subject: string;
  description: string;
  priority: TicketPriority;
}

export async function createTicket(input: CreateTicketInput): Promise<SupportTicket> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<SupportTicket>(
      `INSERT INTO support_tickets (tenant_id, created_by, subject, description, priority, contact_email, unread_by_staff)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING *`,
      [
        input.tenantId,
        input.createdBy,
        input.subject,
        input.description,
        input.priority,
        input.contactEmail,
      ],
    );
    const ticket = result.rows[0]!;

    await client.query(
      `INSERT INTO ticket_messages (ticket_id, tenant_id, author_id, body, is_staff)
       VALUES ($1, $2, $3, $4, FALSE)`,
      [ticket.id, input.tenantId, input.createdBy, input.description],
    );

    await client.query('COMMIT');
    return ticket;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateTicketStatus(
  ticketId: string,
  tenantId: string,
  status: TicketStatus,
): Promise<SupportTicket | null> {
  const closedAt = status === 'CLOSED' ? new Date() : null;
  const result = await pool.query<SupportTicket>(
    `UPDATE support_tickets
     SET status = $1, updated_at = NOW(), closed_at = COALESCE($2, closed_at)
     WHERE id = $3 AND tenant_id = $4
     RETURNING *`,
    [status, closedAt, ticketId, tenantId],
  );
  return result.rows[0] ?? null;
}

export async function updateTicketStatusAdmin(
  ticketId: string,
  status: TicketStatus,
): Promise<SupportTicket | null> {
  const closedAt = status === 'CLOSED' ? new Date() : null;
  const result = await pool.query<SupportTicket>(
    `UPDATE support_tickets st
     SET status = $1, updated_at = NOW(), closed_at = COALESCE($2, st.closed_at)
     FROM tenants t
     WHERE st.id = $3 AND st.tenant_id = t.id AND t.id != $4
     RETURNING st.*`,
    [status, closedAt, ticketId, PLATFORM_TENANT_ID],
  );
  return result.rows[0] ?? null;
}

export async function findMessagesByTicket(
  ticketId: string,
  tenantId: string,
): Promise<TicketMessage[]> {
  const result = await pool.query<TicketMessage>(
    `SELECT tm.*, u.email AS author_email
     FROM ticket_messages tm
     JOIN users u ON u.id = tm.author_id
     WHERE tm.ticket_id = $1 AND tm.tenant_id = $2
     ORDER BY tm.created_at ASC`,
    [ticketId, tenantId],
  );
  return result.rows;
}

export async function findMessagesByTicketAdmin(ticketId: string): Promise<TicketMessage[]> {
  const result = await pool.query<TicketMessage>(
    `SELECT tm.*, u.email AS author_email
     FROM ticket_messages tm
     JOIN users u ON u.id = tm.author_id
     JOIN support_tickets st ON st.id = tm.ticket_id
     JOIN tenants t ON t.id = st.tenant_id
     WHERE tm.ticket_id = $1 AND t.id != $2
     ORDER BY tm.created_at ASC`,
    [ticketId, PLATFORM_TENANT_ID],
  );
  return result.rows;
}

export interface AddMessageInput {
  ticketId: string;
  tenantId: string;
  authorId: string;
  body: string;
  isStaff: boolean;
}

export async function addMessage(input: AddMessageInput): Promise<TicketMessage> {
  const result = await pool.query<TicketMessage>(
    `INSERT INTO ticket_messages (ticket_id, tenant_id, author_id, body, is_staff)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.ticketId, input.tenantId, input.authorId, input.body, input.isStaff],
  );

  const newStatus = input.isStaff ? 'WAITING' : 'IN_PROGRESS';
  await pool.query(
    `UPDATE support_tickets
     SET status = CASE WHEN status = 'CLOSED' THEN 'OPEN' ELSE $1 END,
         updated_at = NOW(),
         unread_by_staff = CASE WHEN $4::boolean THEN FALSE ELSE TRUE END,
         closed_at = CASE WHEN status = 'CLOSED' THEN NULL ELSE closed_at END
     WHERE id = $2 AND tenant_id = $3`,
    [newStatus, input.ticketId, input.tenantId, input.isStaff],
  );

  return result.rows[0]!;
}

import { notFound } from '../../utils/errors.js';

export async function addMessageAdmin(input: AddMessageInput): Promise<TicketMessage> {
  const ticket = await findTicketByIdForAdmin(input.ticketId);
  if (!ticket) {
    throw notFound('errors.ticketNotFound');
  }

  const result = await pool.query<TicketMessage>(
    `INSERT INTO ticket_messages (ticket_id, tenant_id, author_id, body, is_staff)
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING *`,
    [input.ticketId, ticket.tenant_id, input.authorId, input.body],
  );

  await pool.query(
    `UPDATE support_tickets
     SET status = CASE WHEN status = 'CLOSED' THEN 'OPEN' ELSE 'WAITING' END,
         updated_at = NOW(),
         unread_by_staff = FALSE,
         closed_at = NULL
     WHERE id = $1`,
    [input.ticketId],
  );

  return result.rows[0]!;
}

export async function markTicketReadByStaff(ticketId: string): Promise<void> {
  await pool.query(
    `UPDATE support_tickets st
     SET unread_by_staff = FALSE, updated_at = NOW()
     FROM tenants t
     WHERE st.id = $1 AND st.tenant_id = t.id AND t.id != $2`,
    [ticketId, PLATFORM_TENANT_ID],
  );
}

export async function assignTicket(
  ticketId: string,
  assignedTo: string | null,
): Promise<SupportTicket | null> {
  const result = await pool.query<SupportTicket>(
    `UPDATE support_tickets st
     SET assigned_to = $1, updated_at = NOW()
     FROM tenants t
     WHERE st.id = $2 AND st.tenant_id = t.id AND t.id != $3
     RETURNING st.*`,
    [assignedTo, ticketId, PLATFORM_TENANT_ID],
  );
  return result.rows[0] ?? null;
}

export async function countUnreadTicketsForAdmin(): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM support_tickets st
     JOIN tenants t ON t.id = st.tenant_id
     WHERE t.id != $1
       AND st.unread_by_staff = TRUE
       AND st.status IN ('OPEN', 'IN_PROGRESS', 'WAITING')`,
    [PLATFORM_TENANT_ID],
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

export async function countOpenTicketsByTenant(tenantId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM support_tickets
     WHERE tenant_id = $1 AND status IN ('OPEN', 'IN_PROGRESS', 'WAITING')`,
    [tenantId],
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

export async function getTenantDashboardStats(tenantId: string): Promise<{
  items: number;
  openTickets: number;
  users: number;
}> {
  const [items, tickets, users] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM items WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM support_tickets
       WHERE tenant_id = $1 AND status IN ('OPEN', 'IN_PROGRESS', 'WAITING')`,
      [tenantId],
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users WHERE tenant_id = $1`,
      [tenantId],
    ),
  ]);

  return {
    items: parseInt(items.rows[0]?.count ?? '0', 10),
    openTickets: parseInt(tickets.rows[0]?.count ?? '0', 10),
    users: parseInt(users.rows[0]?.count ?? '0', 10),
  };
}
