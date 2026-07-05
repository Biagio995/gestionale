import { z } from 'zod';
import type { RequestContext, TenantWithStats } from '../../types/index.js';
import { badRequest, conflict, notFound } from '../../utils/errors.js';
import { env } from '../../config/env.js';
import { sendInvitationEmail } from '../../services/mail.service.js';
import { findUserByEmail } from '../auth/auth.repository.js';
import { languageSchema } from '../auth/auth.service.js';
import type { InviteResult } from '../users/users.service.js';
import * as invitationsRepo from '../users/invitations.repository.js';
import * as adminRepo from './admin.repository.js';
import { countUnreadTicketsForAdmin } from '../tickets/tickets.repository.js';

const createCompanySchema = z.object({
  name: z.string().min(2).max(100),
  contactEmail: z.string().email().optional().nullable(),
  adminEmail: z.string().email(),
  language: languageSchema.optional().default('it'),
});

const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

const updateCompanySchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    contactEmail: z.string().email().optional().nullable(),
    status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  })
  .refine((data) => data.name !== undefined || data.contactEmail !== undefined || data.status !== undefined, {
    message: 'errors.validation',
  });

const contractStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED']);
const contractRenewalSchema = z.enum(['NONE', 'MONTHLY', 'YEARLY']);

const createContractSchema = z.object({
  tenantId: z.string().uuid(),
  title: z.string().min(2).max(200),
  contractNumber: z.string().max(100).optional().nullable(),
  status: contractStatusSchema.default('ACTIVE'),
  startsAt: z.string().date(),
  endsAt: z.string().date().optional().nullable(),
  signedAt: z.string().date().optional().nullable(),
  amount: z.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional().default('EUR'),
  autoRenew: z.boolean().optional().default(false),
  renewalType: contractRenewalSchema.optional().default('NONE'),
  notes: z.string().max(4000).optional().nullable(),
  documentUrl: z.string().url().optional().nullable().or(z.literal('')),
});

const updateContractSchema = createContractSchema.omit({ tenantId: true }).partial();

const renewContractSchema = z.object({
  newEndsAt: z.string().date().optional(),
  newAmount: z.number().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
const contractFiltersSchema = z.object({
  tenantId: z.string().uuid().optional(),
  status: contractStatusSchema.optional(),
  expiringInDays: z.coerce.number().int().min(1).max(365).optional(),
});

export interface CreateCompanyResult {
  company: TenantWithStats;
  adminInvitation: InviteResult;
}

export async function listCompanies(): Promise<TenantWithStats[]> {
  return adminRepo.findAllTenants();
}

export async function createCompany(
  context: RequestContext,
  body: unknown,
): Promise<CreateCompanyResult> {
  const input = createCompanySchema.parse(body);

  const existing = await findUserByEmail(input.adminEmail);
  if (existing) {
    throw conflict('errors.emailExists');
  }

  const tenant = await adminRepo.createTenantRecord({
    name: input.name,
    contactEmail: input.contactEmail,
  });

  const pending = await invitationsRepo.findPendingInvitationByEmail(
    tenant.id,
    input.adminEmail,
  );
  if (pending) {
    throw conflict('errors.invitationPending');
  }

  const invitation = await invitationsRepo.createInvitation({
    tenantId: tenant.id,
    email: input.adminEmail,
    role: 'ADMIN',
    invitedBy: context.userId,
  });

  const inviteUrl = `${env.appUrl}/accept-invite?token=${invitation.token}`;
  await sendInvitationEmail({
    to: input.adminEmail,
    tenantName: input.name,
    inviteUrl,
  });

  const refreshed = await adminRepo.findTenantById(tenant.id);
  const adminInvitation: InviteResult = {
    email: invitation.email,
    role: invitation.role,
    inviteUrl,
    expiresAt: invitation.expires_at.toISOString(),
  };

  return {
    company: refreshed ?? tenant,
    adminInvitation,
  };
}

export async function updateCompanyStatus(
  tenantId: string,
  body: unknown,
): Promise<TenantWithStats> {
  const input = updateStatusSchema.parse(body);
  const updated = await adminRepo.updateTenantStatus(tenantId, input.status);
  if (!updated) {
    throw notFound('errors.tenantNotFound');
  }
  return updated;
}

export async function updateCompany(
  tenantId: string,
  body: unknown,
): Promise<TenantWithStats> {
  const input = updateCompanySchema.parse(body);
  const updated = await adminRepo.updateTenant(
    tenantId,
    {
      name: input.name,
      contactEmail: input.contactEmail,
      status: input.status,
    },
  );
  if (!updated) {
    throw notFound('errors.tenantNotFound');
  }
  return updated;
}

export async function getDashboardStats(_context: RequestContext): Promise<{
  companies: number;
  openTickets: number;
  activeCompanies: number;
  unreadTickets: number;
  expiringContracts: number;
}> {
  const companies = await adminRepo.findAllTenants();
  const openTickets = companies.reduce((sum, c) => sum + c.open_tickets_count, 0);
  const activeCompanies = companies.filter((c) => c.status === 'ACTIVE').length;
  const unreadTickets = await countUnreadTicketsForAdmin();
  const expiringContracts = await adminRepo.countExpiringContracts(30);
  return {
    companies: companies.length,
    openTickets,
    activeCompanies,
    unreadTickets,
    expiringContracts,
  };
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addPeriod(dateStr: string, type: adminRepo.ContractRenewalType): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (type === 'MONTHLY') {
    d.setMonth(d.getMonth() + 1);
  } else if (type === 'YEARLY') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return formatDateOnly(d);
}

export function assertNotPlatformTenant(tenantId: string): void {
  if (adminRepo.isPlatformTenant(tenantId)) {
    throw badRequest('errors.invalidTenant');
  }
}

export async function listContracts(query: unknown): Promise<adminRepo.CompanyContract[]> {
  const filters = contractFiltersSchema.parse(query ?? {});
  if (filters.tenantId) {
    assertNotPlatformTenant(filters.tenantId);
  }
  return adminRepo.listContracts(filters);
}

export async function createContract(
  context: RequestContext,
  body: unknown,
): Promise<adminRepo.CompanyContract> {
  const input = createContractSchema.parse(body);
  assertNotPlatformTenant(input.tenantId);
  const tenant = await adminRepo.findTenantById(input.tenantId);
  if (!tenant) throw notFound('errors.tenantNotFound');
  if (input.endsAt && input.endsAt < input.startsAt) {
    throw badRequest('errors.validation');
  }
  return adminRepo.createContract({
    tenantId: input.tenantId,
    title: input.title,
    contractNumber: input.contractNumber,
    status: input.status,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    signedAt: input.signedAt,
    amount: input.amount,
    currency: input.currency,
    autoRenew: input.autoRenew,
    renewalType: input.renewalType,
    notes: input.notes,
    documentUrl: input.documentUrl === '' ? null : input.documentUrl,
    createdBy: context.userId,
  });
}

export async function getContract(contractId: string): Promise<{
  contract: adminRepo.CompanyContract;
  renewals: adminRepo.ContractRenewalRecord[];
}> {
  const contract = await adminRepo.findContractById(contractId);
  if (!contract) throw notFound('errors.contractNotFound');
  const renewals = await adminRepo.findRenewalsByContract(contractId);
  return { contract, renewals };
}

export async function updateContract(
  contractId: string,
  body: unknown,
): Promise<adminRepo.CompanyContract> {
  const input = updateContractSchema.parse(body);
  if (input.endsAt && input.startsAt && input.endsAt < input.startsAt) {
    throw badRequest('errors.validation');
  }
  const updated = await adminRepo.updateContract(contractId, {
    ...input,
    documentUrl: input.documentUrl === '' ? null : input.documentUrl,
  });
  if (!updated) throw notFound('errors.contractNotFound');
  return updated;
}

export async function renewContract(
  context: RequestContext,
  contractId: string,
  body: unknown,
): Promise<adminRepo.CompanyContract> {
  const input = renewContractSchema.parse(body ?? {});
  const contract = await adminRepo.findContractById(contractId);
  if (!contract) throw notFound('errors.contractNotFound');
  if (contract.status === 'TERMINATED') {
    throw badRequest('errors.contractCannotRenew');
  }

  const previousEnd = contract.ends_at
    ? formatDateOnly(contract.ends_at)
    : formatDateOnly(contract.starts_at);
  const newStartsAt = previousEnd;
  const newEndsAt =
    input.newEndsAt ??
    (contract.renewal_type !== 'NONE'
      ? addPeriod(newStartsAt, contract.renewal_type)
      : addPeriod(newStartsAt, 'MONTHLY'));

  if (newEndsAt < newStartsAt) {
    throw badRequest('errors.validation');
  }

  const newAmount =
    input.newAmount !== undefined
      ? input.newAmount
      : contract.amount
        ? parseFloat(contract.amount)
        : null;

  const renewed = await adminRepo.renewContract({
    contractId,
    renewedBy: context.userId,
    newStartsAt,
    newEndsAt,
    newAmount,
    notes: input.notes,
  });
  if (!renewed) throw notFound('errors.contractNotFound');
  return renewed;
}

export async function deleteContract(contractId: string): Promise<void> {
  const ok = await adminRepo.softDeleteContract(contractId);
  if (!ok) throw notFound('errors.contractNotFound');
}
