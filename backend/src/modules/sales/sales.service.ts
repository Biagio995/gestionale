import { z } from 'zod';
import type { RequestContext } from '../../types/index.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { logEvent } from '../audit/audit.service.js';
import { validateCustomerFiscalFields } from '../fiscal/fiscal.service.js';
import * as fiscalRepo from '../fiscal/fiscal.repository.js';
import * as crmRepo from '../crm/crm.repository.js';
import * as chainRepo from './sales.chain.repository.js';
import * as salesRepo from './sales.repository.js';
import type {
  DeliveryNoteStatus,
  InvoiceStatus,
  OrderStatus,
  QuoteStatus,
} from './sales.repository.js';

const lineSchema = z.object({
  itemId: z.string().uuid().optional().nullable(),
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const quoteBodySchema = z.object({
  contactId: z.string().uuid().optional().nullable(),
  dealId: z.string().uuid().optional().nullable(),
  customerCompanyName: z.string().max(200).optional().nullable(),
  customerName: z.string().max(200).optional().nullable(),
  customerVatNumber: z.string().max(16).optional().nullable(),
  customerTaxCode: z.string().max(16).optional().nullable(),
  customerSdiCode: z.string().max(7).optional().nullable(),
  customerPecEmail: z.string().email().optional().nullable().or(z.literal('')),
  customerEmail: z.string().email().optional().nullable().or(z.literal('')),
  customerAddress: z.string().max(500).optional().nullable(),
  defaultTaxRate: z.number().min(0).max(100).optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(5000).optional().nullable(),
  validUntil: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1),
});

const statusSchemas = {
  quote: z.object({ status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED']) }),
  order: z.object({ status: z.enum(['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'FULFILLED', 'CANCELLED']) }),
  deliveryNote: z.object({ status: z.enum(['DRAFT', 'ISSUED', 'SHIPPED', 'DELIVERED', 'CANCELLED']) }),
  invoice: z.object({ status: z.enum(['DRAFT', 'ISSUED', 'SENT', 'PAID', 'CANCELLED']) }),
};

const CONVERTIBLE_QUOTE_STATUSES: QuoteStatus[] = ['DRAFT', 'SENT', 'ACCEPTED'];
const CONVERTIBLE_ORDER_STATUSES: OrderStatus[] = ['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'FULFILLED'];
const CONVERTIBLE_DDT_STATUSES: DeliveryNoteStatus[] = ['DRAFT', 'ISSUED', 'SHIPPED', 'DELIVERED'];

const convertOptionsSchema = z.object({
  skipDdt: z.boolean().optional(),
  paymentDays: z.number().int().min(0).max(365).optional(),
  lines: z
    .array(z.object({ lineId: z.string().uuid(), quantity: z.number().positive() }))
    .optional(),
});

async function getDefaultPaymentDays(tenantId: string): Promise<number> {
  const profile = await fiscalRepo.findFiscalProfile(tenantId);
  return profile?.default_payment_days ?? 30;
}

async function validateLineSelections(
  tenantId: string,
  parentType: 'ORDER' | 'DELIVERY_NOTE',
  parentId: string,
  selections?: chainRepo.LineQuantitySelection[],
): Promise<chainRepo.LineQuantitySelection[] | undefined> {
  if (!selections?.length) return undefined;
  const fulfillment = await chainRepo.getLineFulfillment(tenantId, parentType, parentId);
  const remainingMap = new Map(fulfillment.map((f) => [f.lineId, f.remaining]));
  for (const sel of selections) {
    const remaining = remainingMap.get(sel.lineId);
    if (remaining === undefined) throw badRequest('errors.lineNotFound');
    if (sel.quantity > remaining + 0.0001) throw badRequest('errors.quantityExceedsRemaining');
  }
  return selections;
}

const listFiltersSchema = z.object({
  status: z.string().max(30).optional(),
  search: z.string().max(100).optional(),
  contactId: z.string().uuid().optional(),
});

async function parseListFilters(query: unknown): Promise<salesRepo.SalesListFilters> {
  return listFiltersSchema.parse(query ?? {});
}

async function resolveCustomer(
  tenantId: string,
  input: z.infer<typeof quoteBodySchema>,
): Promise<salesRepo.CustomerSnapshot> {
  if (input.contactId) {
    const fromContact = await salesRepo.findContactSnapshot(input.contactId, tenantId);
    if (!fromContact) throw notFound('errors.contactNotFound');
    const merged = {
      customerCompanyName: input.customerCompanyName ?? fromContact.customerCompanyName,
      customerName: input.customerName ?? fromContact.customerName,
      customerVatNumber: input.customerVatNumber ?? fromContact.customerVatNumber,
      customerTaxCode: input.customerTaxCode ?? fromContact.customerTaxCode,
      customerEmail: input.customerEmail === '' ? null : (input.customerEmail ?? fromContact.customerEmail),
      customerAddress: input.customerAddress ?? fromContact.customerAddress,
      customerSdiCode: input.customerSdiCode ?? fromContact.customerSdiCode,
      customerPecEmail: input.customerPecEmail === '' ? null : (input.customerPecEmail ?? fromContact.customerPecEmail),
    };
    const fiscal = validateCustomerFiscalFields({
      customerVatNumber: merged.customerVatNumber,
      customerTaxCode: merged.customerTaxCode,
      customerSdiCode: merged.customerSdiCode,
      customerPecEmail: merged.customerPecEmail,
    });
    return { ...merged, ...fiscal };
  }

  const fiscal = validateCustomerFiscalFields({
    customerVatNumber: input.customerVatNumber,
    customerTaxCode: input.customerTaxCode,
    customerSdiCode: input.customerSdiCode,
    customerPecEmail: input.customerPecEmail,
  });

  if (!input.customerName?.trim()) {
    throw badRequest('errors.customerNameRequired');
  }

  return {
    customerCompanyName: input.customerCompanyName ?? null,
    customerName: input.customerName,
    customerVatNumber: fiscal.customerVatNumber,
    customerTaxCode: fiscal.customerTaxCode,
    customerEmail: input.customerEmail === '' ? null : (input.customerEmail ?? null),
    customerAddress: input.customerAddress ?? null,
    customerSdiCode: fiscal.customerSdiCode,
    customerPecEmail: fiscal.customerPecEmail,
  };
}

export async function getStats(context: RequestContext) {
  return salesRepo.getSalesStats(context.tenantId);
}

export async function listQuotes(context: RequestContext, query?: unknown) {
  const filters = await parseListFilters(query);
  return salesRepo.findQuotesByTenant(context.tenantId, filters);
}

export async function getQuote(context: RequestContext, quoteId: string) {
  const quote = await salesRepo.findQuoteByIdAndTenant(quoteId, context.tenantId);
  if (!quote) throw notFound('errors.quoteNotFound');
  const lines = await salesRepo.findLinesByParent(context.tenantId, 'QUOTE', quoteId);
  const chain = await chainRepo.findDocumentChain(context.tenantId, 'quote', quoteId);
  return { quote, lines, chain };
}

export async function createQuote(context: RequestContext, body: unknown) {
  const input = quoteBodySchema.parse(body);
  const customer = await resolveCustomer(context.tenantId, input);
  const quote = await salesRepo.createQuote({
    tenantId: context.tenantId,
    ownerId: context.userId,
    contactId: input.contactId,
    dealId: input.dealId,
    customer,
    defaultTaxRate: input.defaultTaxRate,
    currency: input.currency,
    notes: input.notes,
    validUntil: input.validUntil,
    lines: input.lines,
  });
  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'quote_created',
    entityType: 'sales_quote',
    entityId: quote.id,
    context: { documentNumber: quote.document_number },
  });
  return quote;
}

export async function updateQuote(context: RequestContext, quoteId: string, body: unknown) {
  const input = quoteBodySchema.parse(body);
  const customer = await resolveCustomer(context.tenantId, input);
  const quote = await salesRepo.updateQuote(quoteId, context.tenantId, {
    contactId: input.contactId,
    dealId: input.dealId,
    customer,
    defaultTaxRate: input.defaultTaxRate,
    currency: input.currency,
    notes: input.notes,
    validUntil: input.validUntil,
    lines: input.lines,
  });
  if (!quote) throw badRequest('errors.quoteNotEditable');
  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'quote_updated',
    entityType: 'sales_quote',
    entityId: quote.id,
    context: { documentNumber: quote.document_number },
  });
  return quote;
}

export async function updateQuoteStatus(
  context: RequestContext,
  quoteId: string,
  body: unknown,
) {
  const input = statusSchemas.quote.parse(body);
  const quote = await salesRepo.updateQuoteStatus(quoteId, context.tenantId, input.status);
  if (!quote) throw notFound('errors.quoteNotFound');
  return quote;
}

export async function deleteQuote(context: RequestContext, quoteId: string) {
  const quote = await salesRepo.findQuoteByIdAndTenant(quoteId, context.tenantId);
  if (!quote) throw notFound('errors.quoteNotFound');
  if (quote.status === 'CONVERTED') throw badRequest('errors.quoteAlreadyConverted');
  const ok = await salesRepo.softDeleteQuote(quoteId, context.tenantId);
  if (!ok) throw notFound('errors.quoteNotFound');
}

export async function convertQuoteToOrder(context: RequestContext, quoteId: string) {
  const quote = await salesRepo.findQuoteByIdAndTenant(quoteId, context.tenantId);
  if (!quote) throw notFound('errors.quoteNotFound');
  if (!CONVERTIBLE_QUOTE_STATUSES.includes(quote.status)) {
    throw badRequest('errors.quoteNotConvertible');
  }
  const order = await salesRepo.createOrderFromQuote(quote, context.tenantId, context.userId);
  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'quote_converted_to_order',
    entityType: 'sales_order',
    entityId: order.id,
    context: { quoteId, documentNumber: order.document_number },
  });
  return order;
}

export async function listOrders(context: RequestContext, query?: unknown) {
  const filters = await parseListFilters(query);
  return salesRepo.findOrdersByTenant(context.tenantId, filters);
}

export async function getOrder(context: RequestContext, orderId: string) {
  const order = await salesRepo.findOrderByIdAndTenant(orderId, context.tenantId);
  if (!order) throw notFound('errors.orderNotFound');
  const lines = await salesRepo.findLinesByParent(context.tenantId, 'ORDER', orderId);
  const chain = await chainRepo.findDocumentChain(context.tenantId, 'order', orderId);
  const fulfillment = await chainRepo.getLineFulfillment(context.tenantId, 'ORDER', orderId);
  return { order, lines, chain, fulfillment };
}

export async function updateOrderStatus(
  context: RequestContext,
  orderId: string,
  body: unknown,
) {
  const input = statusSchemas.order.parse(body);
  const order = await salesRepo.updateOrderStatus(orderId, context.tenantId, input.status);
  if (!order) throw notFound('errors.orderNotFound');
  return order;
}

export async function convertOrderToDeliveryNote(
  context: RequestContext,
  orderId: string,
  body?: unknown,
) {
  const options = convertOptionsSchema.parse(body ?? {});
  const order = await salesRepo.findOrderByIdAndTenant(orderId, context.tenantId);
  if (!order) throw notFound('errors.orderNotFound');
  if (!CONVERTIBLE_ORDER_STATUSES.includes(order.status)) {
    throw badRequest('errors.orderNotConvertible');
  }
  const lineSelections = await validateLineSelections(
    context.tenantId,
    'ORDER',
    orderId,
    options.lines,
  );
  const note = await salesRepo.createDeliveryNoteFromOrder(
    order,
    context.tenantId,
    context.userId,
    lineSelections,
  );
  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'order_converted_to_delivery_note',
    entityType: 'sales_delivery_note',
    entityId: note.id,
    context: { orderId, documentNumber: note.document_number },
  });
  return note;
}

export async function listDeliveryNotes(context: RequestContext, query?: unknown) {
  const filters = await parseListFilters(query);
  return salesRepo.findDeliveryNotesByTenant(context.tenantId, filters);
}

export async function getDeliveryNote(context: RequestContext, deliveryNoteId: string) {
  const deliveryNote = await salesRepo.findDeliveryNoteByIdAndTenant(deliveryNoteId, context.tenantId);
  if (!deliveryNote) throw notFound('errors.deliveryNoteNotFound');
  const lines = await salesRepo.findLinesByParent(context.tenantId, 'DELIVERY_NOTE', deliveryNoteId);
  const chain = await chainRepo.findDocumentChain(context.tenantId, 'delivery-note', deliveryNoteId);
  const fulfillment = await chainRepo.getLineFulfillment(
    context.tenantId,
    'DELIVERY_NOTE',
    deliveryNoteId,
  );
  return { deliveryNote, lines, chain, fulfillment };
}

export async function updateDeliveryNoteStatus(
  context: RequestContext,
  deliveryNoteId: string,
  body: unknown,
) {
  const input = statusSchemas.deliveryNote.parse(body);
  const note = await salesRepo.updateDeliveryNoteStatus(
    deliveryNoteId,
    context.tenantId,
    input.status,
  );
  if (!note) throw notFound('errors.deliveryNoteNotFound');
  return note;
}

export async function convertDeliveryNoteToInvoice(
  context: RequestContext,
  deliveryNoteId: string,
  body?: unknown,
) {
  const options = convertOptionsSchema.parse(body ?? {});
  const note = await salesRepo.findDeliveryNoteByIdAndTenant(deliveryNoteId, context.tenantId);
  if (!note) throw notFound('errors.deliveryNoteNotFound');
  if (!CONVERTIBLE_DDT_STATUSES.includes(note.status)) {
    throw badRequest('errors.deliveryNoteNotConvertible');
  }
  const order = note.order_id
    ? await salesRepo.findOrderByIdAndTenant(note.order_id, context.tenantId)
    : null;
  const lineSelections = await validateLineSelections(
    context.tenantId,
    'DELIVERY_NOTE',
    deliveryNoteId,
    options.lines,
  );
  const paymentDays = options.paymentDays ?? (await getDefaultPaymentDays(context.tenantId));
  const invoice = await salesRepo.createInvoiceFromDeliveryNote(
    note,
    order,
    context.tenantId,
    context.userId,
    { paymentDays, lineSelections, asDraft: true },
  );
  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'delivery_note_converted_to_invoice',
    entityType: 'sales_invoice',
    entityId: invoice.id,
    context: { deliveryNoteId, documentNumber: invoice.document_number },
  });
  return invoice;
}

export async function listInvoices(context: RequestContext, query?: unknown) {
  const filters = await parseListFilters(query);
  return salesRepo.findInvoicesByTenant(context.tenantId, filters);
}

export async function listContactDocuments(context: RequestContext, contactId: string) {
  const contact = await crmRepo.findContactByIdAndTenant(contactId, context.tenantId);
  if (!contact) throw notFound('errors.contactNotFound');
  return salesRepo.findDocumentsByContact(context.tenantId, contactId);
}

export async function getInvoice(context: RequestContext, invoiceId: string) {
  const invoice = await salesRepo.findInvoiceByIdAndTenant(invoiceId, context.tenantId);
  if (!invoice) throw notFound('errors.invoiceNotFound');
  const lines = await salesRepo.findLinesByParent(context.tenantId, 'INVOICE', invoiceId);
  const chain = await chainRepo.findDocumentChain(context.tenantId, 'invoice', invoiceId);
  return { invoice, lines, chain };
}

export async function updateInvoiceStatus(
  context: RequestContext,
  invoiceId: string,
  body: unknown,
) {
  const input = statusSchemas.invoice.parse(body);
  const invoice = await salesRepo.updateInvoiceStatus(invoiceId, context.tenantId, input.status);
  if (!invoice) throw notFound('errors.invoiceNotFound');
  return invoice;
}

export async function convertOrderToInvoice(
  context: RequestContext,
  orderId: string,
  body?: unknown,
) {
  const options = convertOptionsSchema.parse(body ?? {});
  const order = await salesRepo.findOrderByIdAndTenant(orderId, context.tenantId);
  if (!order) throw notFound('errors.orderNotFound');
  if (!CONVERTIBLE_ORDER_STATUSES.includes(order.status)) {
    throw badRequest('errors.orderNotConvertible');
  }
  const lineSelections = await validateLineSelections(
    context.tenantId,
    'ORDER',
    orderId,
    options.lines,
  );
  const paymentDays = options.paymentDays ?? (await getDefaultPaymentDays(context.tenantId));
  const invoice = await salesRepo.createInvoiceFromOrder(order, context.tenantId, context.userId, {
    paymentDays,
    lineSelections,
    asDraft: true,
  });
  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'order_converted_to_invoice',
    entityType: 'sales_invoice',
    entityId: invoice.id,
    context: { orderId, documentNumber: invoice.document_number, skipDdt: true },
  });
  return invoice;
}

export async function convertQuoteToInvoice(
  context: RequestContext,
  quoteId: string,
  body?: unknown,
) {
  const options = convertOptionsSchema.parse(body ?? {});
  let quote = await salesRepo.findQuoteByIdAndTenant(quoteId, context.tenantId);
  if (!quote) throw notFound('errors.quoteNotFound');

  let order = await salesRepo.findOrderByQuoteId(quoteId, context.tenantId);
  if (!order) {
    if (!CONVERTIBLE_QUOTE_STATUSES.includes(quote.status)) {
      throw badRequest('errors.quoteNotConvertible');
    }
    order = await salesRepo.createOrderFromQuote(quote, context.tenantId, context.userId);
    await logEvent({
      tenantId: context.tenantId,
      userId: context.userId,
      eventType: 'quote_converted_to_order',
      entityType: 'sales_order',
      entityId: order.id,
      context: { quoteId, documentNumber: order.document_number, chained: true },
    });
    quote = (await salesRepo.findQuoteByIdAndTenant(quoteId, context.tenantId))!;
  }

  if (options.skipDdt) {
    const invoice = await convertOrderToInvoice(context, order.id, body);
    await logEvent({
      tenantId: context.tenantId,
      userId: context.userId,
      eventType: 'quote_converted_to_invoice',
      entityType: 'sales_invoice',
      entityId: invoice.id,
      context: { quoteId, documentNumber: invoice.document_number, skipDdt: true },
    });
    return invoice;
  }

  if (!CONVERTIBLE_ORDER_STATUSES.includes(order.status)) {
    throw badRequest('errors.orderNotConvertible');
  }
  const note = await salesRepo.createDeliveryNoteFromOrder(
    order,
    context.tenantId,
    context.userId,
    options.lines ? await validateLineSelections(context.tenantId, 'ORDER', order.id, options.lines) : undefined,
  );
  const paymentDays = options.paymentDays ?? (await getDefaultPaymentDays(context.tenantId));
  const invoice = await salesRepo.createInvoiceFromDeliveryNote(
    note,
    order,
    context.tenantId,
    context.userId,
    {
      paymentDays,
      asDraft: true,
    },
  );
  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'quote_converted_to_invoice',
    entityType: 'sales_invoice',
    entityId: invoice.id,
    context: { quoteId, documentNumber: invoice.document_number },
  });
  return invoice;
}

export async function updateInvoice(context: RequestContext, invoiceId: string, body: unknown) {
  const input = quoteBodySchema.parse(body);
  const customer = await resolveCustomer(context.tenantId, input);
  const invoice = await salesRepo.updateInvoice(invoiceId, context.tenantId, {
    customer,
    defaultTaxRate: input.defaultTaxRate,
    currency: input.currency,
    notes: input.notes,
    lines: input.lines,
  });
  if (!invoice) throw badRequest('errors.invoiceNotEditable');
  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'invoice_updated',
    entityType: 'sales_invoice',
    entityId: invoice.id,
    context: { documentNumber: invoice.document_number },
  });
  return invoice;
}

export async function issueInvoice(context: RequestContext, invoiceId: string) {
  const invoice = await salesRepo.issueInvoice(invoiceId, context.tenantId);
  if (!invoice) throw badRequest('errors.invoiceNotIssuable');
  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'invoice_issued',
    entityType: 'sales_invoice',
    entityId: invoice.id,
    context: { documentNumber: invoice.document_number },
  });
  return invoice;
}

export async function getDocumentChain(
  context: RequestContext,
  kind: 'quote' | 'order' | 'delivery-note' | 'invoice',
  documentId: string,
) {
  return chainRepo.findDocumentChain(context.tenantId, kind, documentId);
}

export async function getPipeline(context: RequestContext) {
  const [quotes, orders, deliveryNotes, invoices] = await Promise.all([
    salesRepo.findQuotesByTenant(context.tenantId, { limit: 50 }),
    salesRepo.findOrdersByTenant(context.tenantId, { limit: 50 }),
    salesRepo.findDeliveryNotesByTenant(context.tenantId, { limit: 50 }),
    salesRepo.findInvoicesByTenant(context.tenantId, { limit: 50 }),
  ]);
  return { quotes, orders, deliveryNotes, invoices };
}
