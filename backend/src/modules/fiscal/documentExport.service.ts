import { z } from 'zod';
import type { RequestContext } from '../../types/index.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { sendDocumentEmail } from '../../services/mail.service.js';
import { logEvent } from '../audit/audit.service.js';
import * as salesRepo from '../sales/sales.repository.js';
import * as fiscalRepo from './fiscal.repository.js';
import { generateDocumentPdf, type DocumentPdfKind } from './documentPdf.generator.js';
import type { FiscalParty } from './fatturapa.generator.js';

const sendEmailSchema = z.object({
  to: z.string().email().optional(),
  subject: z.string().max(200).optional(),
  message: z.string().max(2000).optional(),
});

function profileToParty(profile: fiscalRepo.TenantFiscalProfile): FiscalParty {
  return {
    legalName: profile.legal_name,
    vatNumber: profile.vat_number,
    taxCode: profile.tax_code,
    address: profile.address,
    city: profile.city,
    zipCode: profile.zip_code,
    province: profile.province,
    country: profile.country,
    sdiCode: profile.sdi_code,
    pecEmail: profile.pec_email,
  };
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

async function buildPdf(
  context: RequestContext,
  kind: DocumentPdfKind,
  documentId: string,
): Promise<{ buffer: Buffer; filename: string; customerEmail: string | null }> {
  const profile = await fiscalRepo.findFiscalProfile(context.tenantId);
  if (!profile) throw badRequest('errors.fiscalProfileRequired');

  const supplier = profileToParty(profile);

  if (kind === 'QUOTE') {
    const quote = await salesRepo.findQuoteByIdAndTenant(documentId, context.tenantId);
    if (!quote) throw notFound('errors.quoteNotFound');
    const lines = await salesRepo.findLinesByParent(context.tenantId, 'QUOTE', documentId);
    const buffer = await generateDocumentPdf({
      kind,
      documentNumber: quote.document_number,
      documentDate: formatDate(quote.issued_at ?? quote.created_at),
      supplier,
      customer: {
        companyName: quote.customer_company_name,
        name: quote.customer_name,
        vatNumber: quote.customer_vat_number,
        taxCode: quote.customer_tax_code,
        email: quote.customer_email,
        address: quote.customer_address,
        sdiCode: quote.customer_sdi_code,
        pecEmail: quote.customer_pec_email,
      },
      lines,
      subtotal: quote.subtotal,
      taxTotal: quote.tax_total,
      total: quote.total,
      currency: quote.currency,
      notes: quote.notes,
      validUntil: quote.valid_until ? formatDate(quote.valid_until) : null,
    });
    return { buffer, filename: `${quote.document_number}.pdf`, customerEmail: quote.customer_email };
  }

  if (kind === 'ORDER') {
    const order = await salesRepo.findOrderByIdAndTenant(documentId, context.tenantId);
    if (!order) throw notFound('errors.orderNotFound');
    const lines = await salesRepo.findLinesByParent(context.tenantId, 'ORDER', documentId);
    const buffer = await generateDocumentPdf({
      kind,
      documentNumber: order.document_number,
      documentDate: formatDate(order.order_date ?? order.issued_at ?? order.created_at),
      supplier,
      customer: {
        companyName: order.customer_company_name,
        name: order.customer_name,
        vatNumber: order.customer_vat_number,
        taxCode: order.customer_tax_code,
        email: order.customer_email,
        address: order.customer_address,
        sdiCode: order.customer_sdi_code,
        pecEmail: order.customer_pec_email,
      },
      lines,
      subtotal: order.subtotal,
      taxTotal: order.tax_total,
      total: order.total,
      currency: order.currency,
      notes: order.notes,
    });
    return { buffer, filename: `${order.document_number}.pdf`, customerEmail: order.customer_email };
  }

  if (kind === 'DELIVERY_NOTE') {
    const note = await salesRepo.findDeliveryNoteByIdAndTenant(documentId, context.tenantId);
    if (!note) throw notFound('errors.deliveryNoteNotFound');
    const lines = await salesRepo.findLinesByParent(context.tenantId, 'DELIVERY_NOTE', documentId);
    const buffer = await generateDocumentPdf({
      kind,
      documentNumber: note.document_number,
      documentDate: formatDate(note.issued_at ?? note.created_at),
      supplier,
      customer: {
        companyName: note.customer_company_name,
        name: note.customer_name,
        vatNumber: note.customer_vat_number,
        taxCode: note.customer_tax_code,
        email: note.customer_email,
        address: note.customer_address,
        sdiCode: note.customer_sdi_code,
        pecEmail: note.customer_pec_email,
      },
      lines,
      subtotal: note.subtotal,
      taxTotal: note.tax_total,
      total: note.total,
      currency: note.currency,
      notes: note.notes,
    });
    return { buffer, filename: `${note.document_number}.pdf`, customerEmail: note.customer_email };
  }

  const invoice = await salesRepo.findInvoiceByIdAndTenant(documentId, context.tenantId);
  if (!invoice) throw notFound('errors.invoiceNotFound');
  const lines = await salesRepo.findLinesByParent(context.tenantId, 'INVOICE', documentId);
  const buffer = await generateDocumentPdf({
    kind: 'INVOICE',
    documentNumber: invoice.document_number,
    documentDate: formatDate(invoice.invoice_date ?? invoice.issued_at ?? invoice.created_at),
    supplier,
    customer: {
      companyName: invoice.customer_company_name,
      name: invoice.customer_name,
      vatNumber: invoice.customer_vat_number,
      taxCode: invoice.customer_tax_code,
      email: invoice.customer_email,
      address: invoice.customer_address,
      sdiCode: invoice.customer_sdi_code,
      pecEmail: invoice.customer_pec_email,
    },
    lines,
    subtotal: invoice.subtotal,
    taxTotal: invoice.tax_total,
    total: invoice.total,
    currency: invoice.currency,
    notes: invoice.notes,
    dueDate: invoice.due_date ? formatDate(invoice.due_date) : null,
    paymentStatus: invoice.payment_status,
    sdiStatus: invoice.sdi_status,
  });
  return { buffer, filename: `${invoice.document_number}.pdf`, customerEmail: invoice.customer_email };
}

export async function getDocumentPdf(
  context: RequestContext,
  kind: DocumentPdfKind,
  documentId: string,
): Promise<{ buffer: Buffer; filename: string }> {
  const { buffer, filename } = await buildPdf(context, kind, documentId);
  return { buffer, filename };
}

export async function emailDocument(
  context: RequestContext,
  kind: DocumentPdfKind,
  documentId: string,
  body: unknown,
): Promise<{ sentTo: string }> {
  const input = sendEmailSchema.parse(body ?? {});
  const { buffer, filename, customerEmail } = await buildPdf(context, kind, documentId);
  const to = input.to ?? customerEmail;
  if (!to) throw badRequest('errors.customerEmailRequired');

  const kindLabel =
    kind === 'QUOTE'
      ? 'Preventivo'
      : kind === 'ORDER'
        ? 'Ordine'
        : kind === 'DELIVERY_NOTE'
          ? 'DDT'
          : 'Fattura';

  await sendDocumentEmail({
    to,
    subject: input.subject ?? `${kindLabel} ${filename.replace('.pdf', '')}`,
    text:
      input.message ??
      `In allegato il documento ${kindLabel.toLowerCase()} richiesto.\n\nCordiali saluti.`,
    attachment: { filename, content: buffer },
  });

  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'document_emailed',
    entityType: kind.toLowerCase(),
    entityId: documentId,
    context: { to, filename },
  });

  return { sentTo: to };
}
