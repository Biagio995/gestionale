import { z } from 'zod';
import type { RequestContext, SupportTicketWithMeta, TicketMessage, TicketStatus } from '../../types/index.js';
import { forbidden, notFound } from '../../utils/errors.js';
import { pool } from '../../db/pool.js';
import {
  notifyClientTicketReply,
  notifyPlatformNewTicket,
} from '../../services/mail.service.js';
import { findUserByIdAndTenant } from '../auth/auth.repository.js';
import * as ticketsRepo from './tickets.repository.js';

const prioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);
const statusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'WAITING', 'CLOSED']);

const createTicketSchema = z.object({
  subject: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  priority: prioritySchema.optional().default('NORMAL'),
});

const messageSchema = z.object({
  body: z.string().min(1).max(5000),
});

const updateStatusSchema = z.object({
  status: statusSchema,
});

const assignSchema = z.object({
  assignedTo: z.string().uuid().nullable(),
});

const listFiltersSchema = z.object({
  status: statusSchema.optional(),
  unreadOnly: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
});

async function assertTenantActive(tenantId: string): Promise<void> {
  const result = await pool.query<{ status: string }>(
    `SELECT status FROM tenants WHERE id = $1`,
    [tenantId],
  );
  if (result.rows[0]?.status === 'SUSPENDED') {
    throw forbidden('errors.tenantSuspended');
  }
}

export async function listTickets(context: RequestContext): Promise<SupportTicketWithMeta[]> {
  return ticketsRepo.findTicketsByTenant(context.tenantId);
}

export async function listAllTickets(query: unknown = {}): Promise<SupportTicketWithMeta[]> {
  const filters = listFiltersSchema.parse(query);
  return ticketsRepo.findAllTickets({
    status: filters.status,
    unreadOnly: filters.unreadOnly,
  });
}

export async function countUnreadTickets(): Promise<number> {
  return ticketsRepo.countUnreadTicketsForAdmin();
}

export async function createTicket(
  context: RequestContext,
  body: unknown,
): Promise<SupportTicketWithMeta> {
  await assertTenantActive(context.tenantId);
  const input = createTicketSchema.parse(body);

  const author = await findUserByIdAndTenant(context.userId, context.tenantId);
  if (!author) {
    throw notFound('errors.userNotFound');
  }

  const ticket = await ticketsRepo.createTicket({
    tenantId: context.tenantId,
    createdBy: context.userId,
    contactEmail: author.email,
    subject: input.subject,
    description: input.description,
    priority: input.priority,
  });

  const full = await ticketsRepo.findTicketByIdAndTenant(ticket.id, context.tenantId);

  void notifyPlatformNewTicket({
    ticketNumber: ticket.ticket_number,
    companyName: full?.tenant_name ?? '—',
    subject: ticket.subject,
    contactEmail: ticket.contact_email,
    priority: ticket.priority,
  }).catch((err) => console.error('[mail] notifyPlatformNewTicket failed', err));

  return full!;
}

export async function getTicket(
  context: RequestContext,
  ticketId: string,
): Promise<{ ticket: SupportTicketWithMeta; messages: TicketMessage[] }> {
  const ticket = await ticketsRepo.findTicketByIdAndTenant(ticketId, context.tenantId);
  if (!ticket) {
    throw notFound('errors.ticketNotFound');
  }
  const messages = await ticketsRepo.findMessagesByTicket(ticketId, context.tenantId);
  return { ticket, messages };
}

export async function getTicketAdmin(
  ticketId: string,
): Promise<{ ticket: SupportTicketWithMeta; messages: TicketMessage[] }> {
  const ticket = await ticketsRepo.findTicketByIdForAdmin(ticketId);
  if (!ticket) {
    throw notFound('errors.ticketNotFound');
  }
  const messages = await ticketsRepo.findMessagesByTicketAdmin(ticketId);
  await ticketsRepo.markTicketReadByStaff(ticketId);
  return { ticket: { ...ticket, unread_by_staff: false }, messages };
}

export async function addMessage(
  context: RequestContext,
  ticketId: string,
  body: unknown,
): Promise<TicketMessage> {
  const input = messageSchema.parse(body);
  const ticket = await ticketsRepo.findTicketByIdAndTenant(ticketId, context.tenantId);
  if (!ticket) {
    throw notFound('errors.ticketNotFound');
  }

  return ticketsRepo.addMessage({
    ticketId,
    tenantId: context.tenantId,
    authorId: context.userId,
    body: input.body,
    isStaff: false,
  });
}

export async function addMessageAdmin(
  context: RequestContext,
  ticketId: string,
  body: unknown,
): Promise<TicketMessage> {
  const input = messageSchema.parse(body);
  const ticket = await ticketsRepo.findTicketByIdForAdmin(ticketId);
  if (!ticket) {
    throw notFound('errors.ticketNotFound');
  }

  const message = await ticketsRepo.addMessageAdmin({
    ticketId,
    tenantId: ticket.tenant_id,
    authorId: context.userId,
    body: input.body,
    isStaff: true,
  });

  void notifyClientTicketReply({
    to: ticket.contact_email,
    ticketNumber: ticket.ticket_number,
    subject: ticket.subject,
  }).catch((err) => console.error('[mail] notifyClientTicketReply failed', err));

  return message;
}

export async function updateStatus(
  context: RequestContext,
  ticketId: string,
  body: unknown,
): Promise<SupportTicketWithMeta> {
  const input = updateStatusSchema.parse(body);
  const isAdmin = context.role === 'ADMIN' || context.role === 'SUPER_ADMIN';
  if (!isAdmin) {
    throw forbidden('errors.insufficientRole');
  }

  const updated = await ticketsRepo.updateTicketStatus(
    ticketId,
    context.tenantId,
    input.status as TicketStatus,
  );
  if (!updated) {
    throw notFound('errors.ticketNotFound');
  }
  const full = await ticketsRepo.findTicketByIdAndTenant(ticketId, context.tenantId);
  return full!;
}

export async function updateStatusAdmin(
  ticketId: string,
  body: unknown,
): Promise<SupportTicketWithMeta> {
  const input = updateStatusSchema.parse(body);
  const updated = await ticketsRepo.updateTicketStatusAdmin(ticketId, input.status as TicketStatus);
  if (!updated) {
    throw notFound('errors.ticketNotFound');
  }
  const full = await ticketsRepo.findTicketByIdForAdmin(ticketId);
  return full!;
}

export async function assignTicketAdmin(
  ticketId: string,
  body: unknown,
): Promise<SupportTicketWithMeta> {
  const input = assignSchema.parse(body);
  const updated = await ticketsRepo.assignTicket(ticketId, input.assignedTo);
  if (!updated) {
    throw notFound('errors.ticketNotFound');
  }
  const full = await ticketsRepo.findTicketByIdForAdmin(ticketId);
  return full!;
}

export async function getTenantStats(context: RequestContext): Promise<{
  items: number;
  openTickets: number;
  users: number;
}> {
  return ticketsRepo.getTenantDashboardStats(context.tenantId);
}
