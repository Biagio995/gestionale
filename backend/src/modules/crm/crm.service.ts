import { z } from 'zod';
import type { RequestContext } from '../../types/index.js';
import { notFound } from '../../utils/errors.js';
import { validateCustomerFiscalFields } from '../fiscal/fiscal.service.js';
import * as crmRepo from './crm.repository.js';
import type { ActivityType, ContactStatus, DealStage } from './crm.repository.js';

const contactStatuses = ['LEAD', 'CUSTOMER', 'INACTIVE'] as const;
const dealStages = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;
const activityTypes = ['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK'] as const;

const contactBodySchema = z.object({
  companyName: z.string().max(200).optional().nullable(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  status: z.enum(contactStatuses).optional(),
  notes: z.string().max(5000).optional().nullable(),
  vatNumber: z.string().max(16).optional().nullable(),
  taxCode: z.string().max(16).optional().nullable(),
  sdiCode: z.string().max(7).optional().nullable(),
  pecEmail: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().max(500).optional().nullable(),
});

const contactUpdateSchema = contactBodySchema.partial();

const dealBodySchema = z.object({
  contactId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  value: z.number().min(0),
  currency: z.string().length(3).optional(),
  stage: z.enum(dealStages).optional(),
  expectedCloseDate: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

const dealUpdateSchema = dealBodySchema.partial();

const activityBodySchema = z.object({
  contactId: z.string().uuid().optional().nullable(),
  dealId: z.string().uuid().optional().nullable(),
  activityType: z.enum(activityTypes),
  subject: z.string().min(1).max(200),
  body: z.string().max(5000).optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
});

export async function getStats(context: RequestContext) {
  return crmRepo.getCrmStats(context.tenantId);
}

export async function listContacts(context: RequestContext, status?: ContactStatus) {
  return crmRepo.findContactsByTenant(context.tenantId, status);
}

export async function getContact(context: RequestContext, contactId: string) {
  const contact = await crmRepo.findContactByIdAndTenant(contactId, context.tenantId);
  if (!contact) throw notFound('errors.contactNotFound');
  const [activities, deals] = await Promise.all([
    crmRepo.findActivitiesByContact(contactId, context.tenantId),
    crmRepo.findDealsByTenant(context.tenantId, { contactId }),
  ]);
  return { contact, activities, deals };
}

export async function createContact(context: RequestContext, body: unknown) {
  const input = contactBodySchema.parse(body);
  const fiscal = validateCustomerFiscalFields({
    customerVatNumber: input.vatNumber,
    customerTaxCode: input.taxCode,
    customerSdiCode: input.sdiCode,
    customerPecEmail: input.pecEmail === '' ? null : input.pecEmail,
  });
  return crmRepo.createContact({
    tenantId: context.tenantId,
    ownerId: context.userId,
    companyName: input.companyName,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email || null,
    phone: input.phone,
    jobTitle: input.jobTitle,
    status: input.status,
    notes: input.notes,
    vatNumber: fiscal.customerVatNumber,
    taxCode: fiscal.customerTaxCode,
    sdiCode: fiscal.customerSdiCode,
    pecEmail: fiscal.customerPecEmail,
    address: input.address ?? null,
  });
}

export async function updateContact(
  context: RequestContext,
  contactId: string,
  body: unknown,
) {
  const input = contactUpdateSchema.parse(body);
  const fiscal = validateCustomerFiscalFields({
    customerVatNumber: input.vatNumber,
    customerTaxCode: input.taxCode,
    customerSdiCode: input.sdiCode,
    customerPecEmail: input.pecEmail === '' ? null : input.pecEmail,
  });
  const contact = await crmRepo.updateContact({
    contactId,
    tenantId: context.tenantId,
    companyName: input.companyName,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email === '' ? null : input.email,
    phone: input.phone,
    jobTitle: input.jobTitle,
    status: input.status,
    notes: input.notes,
    vatNumber: input.vatNumber !== undefined ? fiscal.customerVatNumber : undefined,
    taxCode: input.taxCode !== undefined ? fiscal.customerTaxCode : undefined,
    sdiCode: input.sdiCode !== undefined ? fiscal.customerSdiCode : undefined,
    pecEmail: input.pecEmail !== undefined ? fiscal.customerPecEmail : undefined,
    address: input.address,
  });
  if (!contact) throw notFound('errors.contactNotFound');
  return contact;
}

export async function deleteContact(context: RequestContext, contactId: string) {
  const ok = await crmRepo.softDeleteContact(contactId, context.tenantId);
  if (!ok) throw notFound('errors.contactNotFound');
}

export async function listDeals(
  context: RequestContext,
  filters?: { stage?: DealStage; contactId?: string },
) {
  return crmRepo.findDealsByTenant(context.tenantId, filters);
}

export async function createDeal(context: RequestContext, body: unknown) {
  const input = dealBodySchema.parse(body);
  return crmRepo.createDeal({
    tenantId: context.tenantId,
    ownerId: context.userId,
    contactId: input.contactId,
    title: input.title,
    value: input.value,
    currency: input.currency,
    stage: input.stage,
    expectedCloseDate: input.expectedCloseDate,
    notes: input.notes,
  });
}

export async function updateDeal(
  context: RequestContext,
  dealId: string,
  body: unknown,
) {
  const input = dealUpdateSchema.parse(body);
  const deal = await crmRepo.updateDeal({
    dealId,
    tenantId: context.tenantId,
    contactId: input.contactId,
    title: input.title,
    value: input.value,
    currency: input.currency,
    stage: input.stage,
    expectedCloseDate: input.expectedCloseDate,
    notes: input.notes,
  });
  if (!deal) throw notFound('errors.dealNotFound');
  return deal;
}

export async function deleteDeal(context: RequestContext, dealId: string) {
  const ok = await crmRepo.softDeleteDeal(dealId, context.tenantId);
  if (!ok) throw notFound('errors.dealNotFound');
}

export async function createActivity(context: RequestContext, body: unknown) {
  const input = activityBodySchema.parse(body);
  return crmRepo.createActivity({
    tenantId: context.tenantId,
    createdBy: context.userId,
    contactId: input.contactId,
    dealId: input.dealId,
    activityType: input.activityType,
    subject: input.subject,
    body: input.body,
    dueAt: input.dueAt ? new Date(input.dueAt) : null,
  });
}
