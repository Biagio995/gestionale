import { z } from 'zod';
import type { RequestContext } from '../../types/index.js';
import { env } from '../../config/env.js';
import { badRequest, notFound } from '../../utils/errors.js';
import {
  normalizeItalianVat,
  validateItalianTaxCode,
  validateItalianVat,
  validatePecEmail,
  validateSdiCode,
  validateVatWithOptionalVies,
} from '../../utils/italianFiscal.js';
import { logEvent } from '../audit/audit.service.js';
import * as salesRepo from '../sales/sales.repository.js';
import { generateFatturaPaXml, hashXml, type FiscalParty } from './fatturapa.generator.js';
import { parsePassiveInvoiceXml } from './fatturapa.parser.js';
import * as fiscalRepo from './fiscal.repository.js';

const fiscalProfileSchema = z.object({
  legalName: z.string().min(2).max(200),
  vatNumber: z.string().min(11).max(16),
  taxCode: z.string().max(16).optional().nullable(),
  fiscalRegime: z.string().max(10).optional(),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  zipCode: z.string().max(10).optional().nullable(),
  province: z.string().max(2).optional().nullable(),
  country: z.string().length(2).optional(),
  sdiCode: z.string().max(7).optional().nullable(),
  pecEmail: z.string().email().optional().nullable().or(z.literal('')),
  defaultPaymentDays: z.number().int().min(0).max(365).optional(),
});

const validateVatSchema = z.object({
  vatNumber: z.string().min(11).max(16),
});

const paymentSchema = z.object({
  paidAmount: z.number().min(0),
  paidAt: z.string().datetime().optional().nullable(),
});

const passiveInvoiceSchema = z.object({
  supplierName: z.string().min(1).max(200),
  supplierVatNumber: z.string().max(16).optional().nullable(),
  supplierTaxCode: z.string().max(16).optional().nullable(),
  documentNumber: z.string().min(1).max(50),
  invoiceDate: z.string(),
  dueDate: z.string().optional().nullable(),
  subtotal: z.number().min(0).optional(),
  taxTotal: z.number().min(0).optional(),
  total: z.number().min(0),
  currency: z.string().length(3).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

function assertValidVatOrThrow(vatNumber: string): string {
  const result = validateItalianVat(vatNumber);
  if (!result.valid || !result.normalized) {
    throw badRequest('errors.invalidVatNumber');
  }
  return result.normalized;
}

function assertValidTaxCodeOrThrow(taxCode: string | null | undefined): void {
  if (!taxCode?.trim()) return;
  if (!validateItalianTaxCode(taxCode)) {
    throw badRequest('errors.invalidTaxCode');
  }
}

export function validateCustomerFiscalFields(input: {
  customerVatNumber?: string | null;
  customerTaxCode?: string | null;
  customerSdiCode?: string | null;
  customerPecEmail?: string | null;
}): {
  customerVatNumber: string | null;
  customerTaxCode: string | null;
  customerSdiCode: string | null;
  customerPecEmail: string | null;
} {
  const customerVatNumber = input.customerVatNumber?.trim()
    ? assertValidVatOrThrow(input.customerVatNumber)
    : null;
  assertValidTaxCodeOrThrow(input.customerTaxCode);

  const customerSdiCode = input.customerSdiCode?.trim().toUpperCase() ?? null;
  if (customerSdiCode && !validateSdiCode(customerSdiCode)) {
    throw badRequest('errors.invalidSdiCode');
  }

  const customerPecEmail = input.customerPecEmail?.trim() || null;
  if (customerPecEmail && !validatePecEmail(customerPecEmail)) {
    throw badRequest('errors.invalidPecEmail');
  }

  return {
    customerVatNumber,
    customerTaxCode: input.customerTaxCode?.trim().toUpperCase() || null,
    customerSdiCode,
    customerPecEmail,
  };
}

export async function getFiscalProfile(context: RequestContext) {
  return fiscalRepo.findFiscalProfile(context.tenantId);
}

export async function saveFiscalProfile(context: RequestContext, body: unknown) {
  const input = fiscalProfileSchema.parse(body);
  const vatNumber = assertValidVatOrThrow(input.vatNumber);
  assertValidTaxCodeOrThrow(input.taxCode);
  if (input.sdiCode && !validateSdiCode(input.sdiCode)) {
    throw badRequest('errors.invalidSdiCode');
  }
  if (input.pecEmail && !validatePecEmail(input.pecEmail)) {
    throw badRequest('errors.invalidPecEmail');
  }

  const profile = await fiscalRepo.upsertFiscalProfile(context.tenantId, {
    ...input,
    vatNumber,
    taxCode: input.taxCode?.trim().toUpperCase() || null,
    pecEmail: input.pecEmail || null,
    sdiCode: input.sdiCode?.trim().toUpperCase() || null,
  });

  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'fiscal_profile_updated',
    entityType: 'tenant_fiscal_profile',
    entityId: context.tenantId,
    context: { vatNumber: profile.vat_number },
  });

  return profile;
}

export async function validateVat(body: unknown) {
  const input = validateVatSchema.parse(body);
  return validateVatWithOptionalVies(input.vatNumber, env.fiscalViesEnabled);
}

export async function sendInvoiceToSdi(context: RequestContext, invoiceId: string) {
  await fiscalRepo.markOverdueInvoices(context.tenantId);

  const bundle = await fiscalRepo.getInvoiceWithLines(invoiceId, context.tenantId);
  if (!bundle) throw notFound('errors.invoiceNotFound');

  const { invoice, lines } = bundle;
  if (invoice.sdi_status === 'ACCEPTED') {
    throw badRequest('errors.invoiceAlreadySentSdi');
  }
  if (!['ISSUED', 'SENT'].includes(invoice.status)) {
    throw badRequest('errors.invoiceNotSendable');
  }

  const supplierProfile = await fiscalRepo.findFiscalProfile(context.tenantId);
  if (!supplierProfile) {
    throw badRequest('errors.fiscalProfileRequired');
  }

  if (!invoice.customer_vat_number) {
    throw badRequest('errors.customerVatRequired');
  }
  if (!invoice.customer_sdi_code && !invoice.customer_pec_email) {
    throw badRequest('errors.sdiOrPecRequired');
  }

  const supplier: FiscalParty = {
    legalName: supplierProfile.legal_name,
    vatNumber: supplierProfile.vat_number,
    taxCode: supplierProfile.tax_code,
    address: supplierProfile.address,
    city: supplierProfile.city,
    zipCode: supplierProfile.zip_code,
    province: supplierProfile.province,
    country: supplierProfile.country,
    sdiCode: supplierProfile.sdi_code,
    pecEmail: supplierProfile.pec_email,
  };

  const customer: FiscalParty = {
    legalName: invoice.customer_company_name || invoice.customer_name || 'Cliente',
    vatNumber: invoice.customer_vat_number,
    taxCode: invoice.customer_tax_code,
    address: invoice.customer_address,
    sdiCode: invoice.customer_sdi_code,
    pecEmail: invoice.customer_pec_email,
  };

  const invoiceDate =
    invoice.invoice_date != null
      ? String(invoice.invoice_date).slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  const xml = generateFatturaPaXml({
    transmissionId: invoice.id,
    progressiveNumber: invoice.document_number.replace(/[^A-Z0-9]/gi, '').slice(-5) || '1',
    supplier,
    customer,
    documentNumber: invoice.document_number,
    invoiceDate,
    currency: invoice.currency,
    lines,
    subtotal: invoice.subtotal,
    taxTotal: invoice.tax_total,
    total: invoice.total,
  });

  const xmlHash = hashXml(xml);
  await fiscalRepo.archiveFiscalXml({
    tenantId: context.tenantId,
    documentType: 'INVOICE_ACTIVE',
    documentId: invoice.id,
    xmlContent: xml,
    xmlHash,
  });

  await fiscalRepo.updateInvoiceSdiResult(invoice.id, context.tenantId, {
    sdiStatus: 'PENDING',
    sdiMessageId: null,
    sdiError: null,
    status: 'SENT',
  });

  const messageId = `SDI-${invoice.document_number}-${Date.now()}`;
  const finalStatus = env.sdiMode === 'production' ? 'PENDING' : 'ACCEPTED';

  const updated = await fiscalRepo.updateInvoiceSdiResult(invoice.id, context.tenantId, {
    sdiStatus: finalStatus,
    sdiMessageId: messageId,
    sdiError: null,
    status: 'SENT',
  });

  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'invoice_sent_sdi',
    entityType: 'sales_invoice',
    entityId: invoice.id,
    context: { messageId, mode: env.sdiMode },
  });

  return { invoice: updated, xmlHash, messageId };
}

export async function getInvoiceXml(context: RequestContext, invoiceId: string) {
  const archive = await fiscalRepo.findInvoiceArchive(context.tenantId, invoiceId);
  if (!archive) throw notFound('errors.invoiceXmlNotFound');
  return { xml: archive.xml_content };
}

export async function recordInvoicePayment(
  context: RequestContext,
  invoiceId: string,
  body: unknown,
) {
  const input = paymentSchema.parse(body);
  const invoice = await fiscalRepo.updateInvoicePayment(invoiceId, context.tenantId, {
    paidAmount: input.paidAmount,
    paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
  });
  if (!invoice) throw notFound('errors.invoiceNotFound');

  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'invoice_payment_recorded',
    entityType: 'sales_invoice',
    entityId: invoiceId,
    context: { paidAmount: input.paidAmount },
  });

  return invoice;
}

export async function listPassiveInvoices(context: RequestContext) {
  await fiscalRepo.markOverdueInvoices(context.tenantId);
  return fiscalRepo.findPassiveInvoicesByTenant(context.tenantId);
}

export async function createPassiveInvoice(context: RequestContext, body: unknown) {
  const input = passiveInvoiceSchema.parse(body);
  if (input.supplierVatNumber) {
    assertValidVatOrThrow(input.supplierVatNumber);
  }
  assertValidTaxCodeOrThrow(input.supplierTaxCode ?? null);

  const passive = await fiscalRepo.createPassiveInvoice(context.tenantId, {
    ...input,
    supplierVatNumber: input.supplierVatNumber
      ? normalizeItalianVat(input.supplierVatNumber)
      : null,
    supplierTaxCode: input.supplierTaxCode?.trim().toUpperCase() || null,
  });

  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'passive_invoice_created',
    entityType: 'sales_passive_invoice',
    entityId: passive.id,
    context: { documentNumber: passive.document_number },
  });

  return passive;
}

export async function recordPassiveInvoicePayment(
  context: RequestContext,
  passiveInvoiceId: string,
  body: unknown,
) {
  const input = paymentSchema.parse(body);
  const invoice = await fiscalRepo.updatePassiveInvoicePayment(
    passiveInvoiceId,
    context.tenantId,
    input.paidAmount,
  );
  if (!invoice) throw notFound('errors.passiveInvoiceNotFound');
  return invoice;
}

export async function getFiscalDashboard(context: RequestContext) {
  await fiscalRepo.markOverdueInvoices(context.tenantId);
  const stats = await salesRepo.getSalesStats(context.tenantId);
  const overdue = await salesRepo.countOverdueInvoices(context.tenantId);
  const passive = await fiscalRepo.findPassiveInvoicesByTenant(context.tenantId);
  const unpaidPassive = passive.filter((p) => p.payment_status !== 'PAID').length;
  return { ...stats, overdueInvoices: overdue, passiveInvoices: passive.length, unpaidPassive };
}

export async function getScadenzario(context: RequestContext) {
  await fiscalRepo.markOverdueInvoices(context.tenantId);
  return fiscalRepo.findScadenzario(context.tenantId);
}

const importXmlSchema = z.object({
  xmlContent: z.string().min(10).max(500_000),
});

export async function importPassiveInvoiceXml(context: RequestContext, body: unknown) {
  const input = importXmlSchema.parse(body);
  let parsed;
  try {
    parsed = parsePassiveInvoiceXml(input.xmlContent);
  } catch {
    throw badRequest('errors.invalidPassiveXml');
  }
  if (parsed.supplierVatNumber) {
    assertValidVatOrThrow(parsed.supplierVatNumber);
  }
  assertValidTaxCodeOrThrow(parsed.supplierTaxCode);

  const passive = await fiscalRepo.createPassiveInvoice(context.tenantId, {
    supplierName: parsed.supplierName,
    supplierVatNumber: parsed.supplierVatNumber,
    supplierTaxCode: parsed.supplierTaxCode,
    documentNumber: parsed.documentNumber,
    invoiceDate: parsed.invoiceDate,
    dueDate: parsed.dueDate,
    subtotal: parsed.subtotal,
    taxTotal: parsed.taxTotal,
    total: parsed.total,
    currency: parsed.currency,
    notes: 'Importata da XML FatturaPA',
  });

  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'passive_invoice_imported',
    entityType: 'sales_passive_invoice',
    entityId: passive.id,
    context: { documentNumber: passive.document_number },
  });

  return passive;
}
