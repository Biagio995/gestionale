import type { PoolClient } from 'pg';
import { pool } from '../../db/pool.js';
import type { LineQuantitySelection } from './sales.chain.repository.js';
import {
  adjustStockForDeliveryNote,
  copyLinesWithSource,
  isDdtFullyInvoiced,
  isOrderFullyFulfilled,
  replaceInvoiceLines,
} from './sales.chain.repository.js';

export type SalesDocumentType = 'QUOTE' | 'ORDER' | 'DELIVERY_NOTE' | 'INVOICE';
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'CONVERTED';
export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'FULFILLED' | 'CANCELLED' | 'CONVERTED';
export type DeliveryNoteStatus = 'DRAFT' | 'ISSUED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'INVOICED';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'SENT' | 'PAID' | 'CANCELLED';
export type SdiStatus = 'NOT_SENT' | 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface SalesDocumentLine {
  id: string;
  tenant_id: string;
  parent_type: SalesDocumentType;
  parent_id: string;
  item_id: string | null;
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
  line_subtotal: string;
  line_tax: string;
  line_total: string;
  sort_order: number;
  source_line_id: string | null;
  created_at: Date;
}

export interface SalesQuote {
  id: string;
  tenant_id: string;
  owner_id: string;
  contact_id: string | null;
  deal_id: string | null;
  document_number: string;
  status: QuoteStatus;
  customer_company_name: string | null;
  customer_name: string | null;
  customer_vat_number: string | null;
  customer_tax_code: string | null;
  customer_email: string | null;
  customer_address: string | null;
  customer_sdi_code: string | null;
  customer_pec_email: string | null;
  subtotal: string;
  tax_total: string;
  total: string;
  default_tax_rate: string;
  currency: string;
  notes: string | null;
  valid_until: string | null;
  issued_at: Date | null;
  created_at: Date;
  updated_at: Date;
  contact_name?: string;
}

export interface SalesOrder {
  id: string;
  tenant_id: string;
  owner_id: string;
  quote_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  document_number: string;
  status: OrderStatus;
  customer_company_name: string | null;
  customer_name: string | null;
  customer_vat_number: string | null;
  customer_tax_code: string | null;
  customer_email: string | null;
  customer_address: string | null;
  customer_sdi_code: string | null;
  customer_pec_email: string | null;
  subtotal: string;
  tax_total: string;
  total: string;
  default_tax_rate: string;
  currency: string;
  notes: string | null;
  order_date: string | null;
  expected_delivery_date: string | null;
  issued_at: Date | null;
  created_at: Date;
  updated_at: Date;
  contact_name?: string;
  quote_number?: string;
}

export interface SalesDeliveryNote {
  id: string;
  tenant_id: string;
  owner_id: string;
  order_id: string | null;
  contact_id: string | null;
  document_number: string;
  status: DeliveryNoteStatus;
  customer_company_name: string | null;
  customer_name: string | null;
  customer_vat_number: string | null;
  customer_tax_code: string | null;
  customer_email: string | null;
  customer_address: string | null;
  customer_sdi_code: string | null;
  customer_pec_email: string | null;
  subtotal: string;
  tax_total: string;
  total: string;
  default_tax_rate: string;
  currency: string;
  notes: string | null;
  shipped_at: Date | null;
  delivered_at: Date | null;
  issued_at: Date | null;
  created_at: Date;
  updated_at: Date;
  contact_name?: string;
  order_number?: string;
}

export interface SalesInvoice {
  id: string;
  tenant_id: string;
  owner_id: string;
  delivery_note_id: string | null;
  order_id: string | null;
  quote_id: string | null;
  contact_id: string | null;
  document_number: string;
  status: InvoiceStatus;
  sdi_status: SdiStatus;
  customer_company_name: string | null;
  customer_name: string | null;
  customer_vat_number: string | null;
  customer_tax_code: string | null;
  customer_email: string | null;
  customer_address: string | null;
  customer_sdi_code: string | null;
  customer_pec_email: string | null;
  subtotal: string;
  tax_total: string;
  total: string;
  default_tax_rate: string;
  currency: string;
  notes: string | null;
  invoice_date: string | null;
  due_date: string | null;
  payment_method: string | null;
  payment_status: string;
  paid_amount: string;
  paid_at: Date | null;
  sdi_sent_at: Date | null;
  sdi_message_id: string | null;
  sdi_error: string | null;
  issued_at: Date | null;
  created_at: Date;
  updated_at: Date;
  contact_name?: string;
  delivery_note_number?: string;
}

export interface SalesStats {
  quotes: number;
  orders: number;
  deliveryNotes: number;
  invoices: number;
  draftInvoices: number;
  pipelineTotal: number;
}

export interface CustomerSnapshot {
  customerCompanyName: string | null;
  customerName: string | null;
  customerVatNumber: string | null;
  customerTaxCode: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  customerSdiCode: string | null;
  customerPecEmail: string | null;
}

export interface LineInput {
  itemId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  sortOrder?: number;
}

const DOCUMENT_PREFIX: Record<SalesDocumentType, string> = {
  QUOTE: 'PRV',
  ORDER: 'ORD',
  DELIVERY_NOTE: 'DDT',
  INVOICE: 'FAT',
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeLineTotals(quantity: number, unitPrice: number, taxRate: number) {
  const lineSubtotal = roundMoney(quantity * unitPrice);
  const lineTax = roundMoney(lineSubtotal * (taxRate / 100));
  const lineTotal = roundMoney(lineSubtotal + lineTax);
  return { lineSubtotal, lineTax, lineTotal };
}

export function sumLineTotals(lines: Array<{ line_subtotal: string; line_tax: string; line_total: string }>) {
  const subtotal = roundMoney(lines.reduce((acc, l) => acc + Number(l.line_subtotal), 0));
  const taxTotal = roundMoney(lines.reduce((acc, l) => acc + Number(l.line_tax), 0));
  const total = roundMoney(lines.reduce((acc, l) => acc + Number(l.line_total), 0));
  return { subtotal, taxTotal, total };
}

async function allocateDocumentNumber(
  client: PoolClient,
  tenantId: string,
  documentType: SalesDocumentType,
): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await client.query<{ last_number: number }>(
    `INSERT INTO sales_document_sequences (tenant_id, document_type, year, last_number)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (tenant_id, document_type, year)
     DO UPDATE SET last_number = sales_document_sequences.last_number + 1
     RETURNING last_number`,
    [tenantId, documentType, year],
  );
  const num = seq.rows[0]!.last_number;
  const prefix = DOCUMENT_PREFIX[documentType];
  return `${prefix}-${year}-${String(num).padStart(4, '0')}`;
}

export async function findContactSnapshot(
  contactId: string,
  tenantId: string,
): Promise<CustomerSnapshot | null> {
  const result = await pool.query<{
    company_name: string | null;
    first_name: string;
    last_name: string;
    email: string | null;
    vat_number: string | null;
    tax_code: string | null;
    sdi_code: string | null;
    pec_email: string | null;
    address: string | null;
  }>(
    `SELECT company_name, first_name, last_name, email, vat_number, tax_code, sdi_code, pec_email, address
     FROM crm_contacts
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [contactId, tenantId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    customerCompanyName: row.company_name,
    customerName: `${row.first_name} ${row.last_name}`.trim(),
    customerVatNumber: row.vat_number,
    customerTaxCode: row.tax_code,
    customerEmail: row.email,
    customerAddress: row.address,
    customerSdiCode: row.sdi_code,
    customerPecEmail: row.pec_email,
  };
}

export async function getSalesStats(tenantId: string): Promise<SalesStats> {
  const result = await pool.query<{
    quotes: string;
    orders: string;
    delivery_notes: string;
    invoices: string;
    draft_invoices: string;
    pipeline_total: string;
  }>(
    `SELECT
       (SELECT COUNT(*)::text FROM sales_quotes WHERE tenant_id = $1 AND deleted_at IS NULL) AS quotes,
       (SELECT COUNT(*)::text FROM sales_orders WHERE tenant_id = $1 AND deleted_at IS NULL) AS orders,
       (SELECT COUNT(*)::text FROM sales_delivery_notes WHERE tenant_id = $1 AND deleted_at IS NULL) AS delivery_notes,
       (SELECT COUNT(*)::text FROM sales_invoices WHERE tenant_id = $1 AND deleted_at IS NULL) AS invoices,
       (SELECT COUNT(*)::text FROM sales_invoices WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'DRAFT') AS draft_invoices,
       (SELECT COALESCE(SUM(total), 0)::text FROM sales_quotes WHERE tenant_id = $1 AND deleted_at IS NULL AND status NOT IN ('CANCELLED', 'CONVERTED', 'REJECTED')) AS pipeline_total`,
    [tenantId],
  );
  const row = result.rows[0]!;
  return {
    quotes: parseInt(row.quotes, 10),
    orders: parseInt(row.orders, 10),
    deliveryNotes: parseInt(row.delivery_notes, 10),
    invoices: parseInt(row.invoices, 10),
    draftInvoices: parseInt(row.draft_invoices, 10),
    pipelineTotal: Number(row.pipeline_total),
  };
}

export async function countOverdueInvoices(tenantId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM sales_invoices
     WHERE tenant_id = $1 AND deleted_at IS NULL AND payment_status = 'OVERDUE'`,
    [tenantId],
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

export interface SalesListFilters {
  status?: string;
  search?: string;
  contactId?: string;
  limit?: number;
}

function appendListFilters(
  filters: SalesListFilters | undefined,
  alias: string,
  searchColumns: string[],
  params: unknown[],
): string {
  let sql = '';
  if (filters?.status) {
    params.push(filters.status);
    sql += ` AND ${alias}.status = $${params.length}`;
  }
  if (filters?.contactId) {
    params.push(filters.contactId);
    sql += ` AND ${alias}.contact_id = $${params.length}`;
  }
  if (filters?.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    const idx = params.length;
    sql += ` AND (${searchColumns.map((col) => `${col} ILIKE $${idx}`).join(' OR ')})`;
  }
  return sql;
}

export interface ContactDocumentSummary {
  id: string;
  document_type: 'QUOTE' | 'ORDER' | 'DELIVERY_NOTE' | 'INVOICE';
  document_number: string;
  status: string;
  total: string;
  currency: string;
  created_at: Date;
}

export async function findDocumentsByContact(
  tenantId: string,
  contactId: string,
): Promise<ContactDocumentSummary[]> {
  const result = await pool.query<ContactDocumentSummary>(
    `SELECT id, 'QUOTE'::text AS document_type, document_number, status::text, total::text, currency, created_at
     FROM sales_quotes WHERE tenant_id = $1 AND contact_id = $2 AND deleted_at IS NULL
     UNION ALL
     SELECT id, 'ORDER', document_number, status::text, total::text, currency, created_at
     FROM sales_orders WHERE tenant_id = $1 AND contact_id = $2 AND deleted_at IS NULL
     UNION ALL
     SELECT id, 'DELIVERY_NOTE', document_number, status::text, total::text, currency, created_at
     FROM sales_delivery_notes WHERE tenant_id = $1 AND contact_id = $2 AND deleted_at IS NULL
     UNION ALL
     SELECT id, 'INVOICE', document_number, status::text, total::text, currency, created_at
     FROM sales_invoices WHERE tenant_id = $1 AND contact_id = $2 AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [tenantId, contactId],
  );
  return result.rows;
}

export async function findLinesByParent(
  tenantId: string,
  parentType: SalesDocumentType,
  parentId: string,
): Promise<SalesDocumentLine[]> {
  const result = await pool.query<SalesDocumentLine>(
    `SELECT * FROM sales_document_lines
     WHERE tenant_id = $1 AND parent_type = $2 AND parent_id = $3
     ORDER BY sort_order ASC, created_at ASC`,
    [tenantId, parentType, parentId],
  );
  return result.rows;
}

async function replaceLines(
  client: PoolClient,
  tenantId: string,
  parentType: SalesDocumentType,
  parentId: string,
  lines: LineInput[],
  defaultTaxRate: number,
): Promise<SalesDocumentLine[]> {
  await client.query(
    `DELETE FROM sales_document_lines
     WHERE tenant_id = $1 AND parent_type = $2 AND parent_id = $3`,
    [tenantId, parentType, parentId],
  );

  const inserted: SalesDocumentLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const taxRate = line.taxRate ?? defaultTaxRate;
    const totals = computeLineTotals(line.quantity, line.unitPrice, taxRate);
    const result = await client.query<SalesDocumentLine>(
      `INSERT INTO sales_document_lines (
         tenant_id, parent_type, parent_id, item_id, description,
         quantity, unit_price, tax_rate, line_subtotal, line_tax, line_total, sort_order
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        tenantId,
        parentType,
        parentId,
        line.itemId ?? null,
        line.description,
        line.quantity,
        line.unitPrice,
        taxRate,
        totals.lineSubtotal,
        totals.lineTax,
        totals.lineTotal,
        line.sortOrder ?? i,
      ],
    );
    inserted.push(result.rows[0]!);
  }
  return inserted;
}

async function copyLines(
  client: PoolClient,
  tenantId: string,
  fromType: SalesDocumentType,
  fromId: string,
  toType: SalesDocumentType,
  toId: string,
): Promise<SalesDocumentLine[]> {
  const source = await client.query<SalesDocumentLine>(
    `SELECT * FROM sales_document_lines
     WHERE tenant_id = $1 AND parent_type = $2 AND parent_id = $3
     ORDER BY sort_order ASC, created_at ASC`,
    [tenantId, fromType, fromId],
  );

  const inserted: SalesDocumentLine[] = [];
  for (const line of source.rows) {
    const result = await client.query<SalesDocumentLine>(
      `INSERT INTO sales_document_lines (
         tenant_id, parent_type, parent_id, item_id, description,
         quantity, unit_price, tax_rate, line_subtotal, line_tax, line_total, sort_order, source_line_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        tenantId,
        toType,
        toId,
        line.item_id,
        line.description,
        line.quantity,
        line.unit_price,
        line.tax_rate,
        line.line_subtotal,
        line.line_tax,
        line.line_total,
        line.sort_order,
        line.id,
      ],
    );
    inserted.push(result.rows[0]!);
  }
  return inserted;
}

async function updateParentTotals(
  client: PoolClient,
  table: 'sales_quotes' | 'sales_orders' | 'sales_delivery_notes' | 'sales_invoices',
  parentId: string,
  tenantId: string,
  lines: SalesDocumentLine[],
): Promise<void> {
  const { subtotal, taxTotal, total } = sumLineTotals(lines);
  await client.query(
    `UPDATE ${table}
     SET subtotal = $1, tax_total = $2, total = $3, updated_at = NOW()
     WHERE id = $4 AND tenant_id = $5`,
    [subtotal, taxTotal, total, parentId, tenantId],
  );
}

// --- Quotes ---

export async function findQuotesByTenant(
  tenantId: string,
  filters?: SalesListFilters,
): Promise<SalesQuote[]> {
  const params: unknown[] = [tenantId];
  const limit = Math.min(filters?.limit ?? 200, 200);
  const filterSql = appendListFilters(
    filters,
    'q',
    ['q.document_number', 'q.customer_company_name', 'q.customer_name'],
    params,
  );
  params.push(limit);
  const result = await pool.query<SalesQuote>(
    `SELECT q.*,
       CASE WHEN c.id IS NOT NULL THEN TRIM(c.first_name || ' ' || c.last_name) END AS contact_name
     FROM sales_quotes q
     LEFT JOIN crm_contacts c ON c.id = q.contact_id
     WHERE q.tenant_id = $1 AND q.deleted_at IS NULL${filterSql}
     ORDER BY q.created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return result.rows;
}

export async function findQuoteByIdAndTenant(
  quoteId: string,
  tenantId: string,
): Promise<SalesQuote | null> {
  const result = await pool.query<SalesQuote>(
    `SELECT q.*,
       CASE WHEN c.id IS NOT NULL THEN TRIM(c.first_name || ' ' || c.last_name) END AS contact_name
     FROM sales_quotes q
     LEFT JOIN crm_contacts c ON c.id = q.contact_id
     WHERE q.id = $1 AND q.tenant_id = $2 AND q.deleted_at IS NULL`,
    [quoteId, tenantId],
  );
  return result.rows[0] ?? null;
}

export interface CreateQuoteInput {
  tenantId: string;
  ownerId: string;
  contactId?: string | null;
  dealId?: string | null;
  customer: CustomerSnapshot;
  defaultTaxRate?: number;
  currency?: string;
  notes?: string | null;
  validUntil?: string | null;
  lines: LineInput[];
}

export async function createQuote(input: CreateQuoteInput): Promise<SalesQuote> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const documentNumber = await allocateDocumentNumber(client, input.tenantId, 'QUOTE');
    const taxRate = input.defaultTaxRate ?? 22;
    const result = await client.query<SalesQuote>(
      `INSERT INTO sales_quotes (
         tenant_id, owner_id, contact_id, deal_id, document_number,
         customer_company_name, customer_name, customer_vat_number, customer_tax_code,
         customer_email, customer_address, customer_sdi_code, customer_pec_email,
         default_tax_rate, currency, notes, valid_until, issued_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())
       RETURNING *`,
      [
        input.tenantId,
        input.ownerId,
        input.contactId ?? null,
        input.dealId ?? null,
        documentNumber,
        input.customer.customerCompanyName,
        input.customer.customerName,
        input.customer.customerVatNumber,
        input.customer.customerTaxCode,
        input.customer.customerEmail,
        input.customer.customerAddress,
        input.customer.customerSdiCode,
        input.customer.customerPecEmail,
        taxRate,
        input.currency ?? 'EUR',
        input.notes ?? null,
        input.validUntil ?? null,
      ],
    );
    const quote = result.rows[0]!;
    const lines = await replaceLines(client, input.tenantId, 'QUOTE', quote.id, input.lines, taxRate);
    await updateParentTotals(client, 'sales_quotes', quote.id, input.tenantId, lines);
    await client.query('COMMIT');
    return (await findQuoteByIdAndTenant(quote.id, input.tenantId))!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateQuote(
  quoteId: string,
  tenantId: string,
  input: Omit<CreateQuoteInput, 'tenantId' | 'ownerId'>,
): Promise<SalesQuote | null> {
  const existing = await findQuoteByIdAndTenant(quoteId, tenantId);
  if (!existing || existing.status !== 'DRAFT') return null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const taxRate = input.defaultTaxRate ?? Number(existing.default_tax_rate);
    await client.query(
      `UPDATE sales_quotes SET
         contact_id = $3,
         deal_id = $4,
         customer_company_name = $5,
         customer_name = $6,
         customer_vat_number = $7,
         customer_tax_code = $8,
         customer_email = $9,
         customer_address = $10,
         customer_sdi_code = $11,
         customer_pec_email = $12,
         default_tax_rate = $13,
         currency = $14,
         notes = $15,
         valid_until = $16,
         updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL AND status = 'DRAFT'`,
      [
        quoteId,
        tenantId,
        input.contactId ?? null,
        input.dealId ?? null,
        input.customer.customerCompanyName,
        input.customer.customerName,
        input.customer.customerVatNumber,
        input.customer.customerTaxCode,
        input.customer.customerEmail,
        input.customer.customerAddress,
        input.customer.customerSdiCode,
        input.customer.customerPecEmail,
        taxRate,
        input.currency ?? existing.currency,
        input.notes ?? null,
        input.validUntil ?? null,
      ],
    );
    const lines = await replaceLines(client, tenantId, 'QUOTE', quoteId, input.lines, taxRate);
    await updateParentTotals(client, 'sales_quotes', quoteId, tenantId, lines);
    await client.query('COMMIT');
    return findQuoteByIdAndTenant(quoteId, tenantId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateQuoteStatus(
  quoteId: string,
  tenantId: string,
  status: QuoteStatus,
): Promise<SalesQuote | null> {
  const result = await pool.query<SalesQuote>(
    `UPDATE sales_quotes SET status = $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
     RETURNING *`,
    [status, quoteId, tenantId],
  );
  return result.rows[0] ?? null;
}

export async function softDeleteQuote(quoteId: string, tenantId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE sales_quotes SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [quoteId, tenantId],
  );
  return (result.rowCount ?? 0) > 0;
}

// --- Orders ---

export async function findOrdersByTenant(
  tenantId: string,
  filters?: SalesListFilters,
): Promise<SalesOrder[]> {
  const params: unknown[] = [tenantId];
  const limit = Math.min(filters?.limit ?? 200, 200);
  const filterSql = appendListFilters(
    filters,
    'o',
    ['o.document_number', 'o.customer_company_name', 'o.customer_name'],
    params,
  );
  params.push(limit);
  const result = await pool.query<SalesOrder>(
    `SELECT o.*,
       CASE WHEN c.id IS NOT NULL THEN TRIM(c.first_name || ' ' || c.last_name) END AS contact_name,
       q.document_number AS quote_number
     FROM sales_orders o
     LEFT JOIN crm_contacts c ON c.id = o.contact_id
     LEFT JOIN sales_quotes q ON q.id = o.quote_id
     WHERE o.tenant_id = $1 AND o.deleted_at IS NULL${filterSql}
     ORDER BY o.created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return result.rows;
}

export async function findOrderByIdAndTenant(
  orderId: string,
  tenantId: string,
): Promise<SalesOrder | null> {
  const result = await pool.query<SalesOrder>(
    `SELECT o.*,
       CASE WHEN c.id IS NOT NULL THEN TRIM(c.first_name || ' ' || c.last_name) END AS contact_name,
       q.document_number AS quote_number
     FROM sales_orders o
     LEFT JOIN crm_contacts c ON c.id = o.contact_id
     LEFT JOIN sales_quotes q ON q.id = o.quote_id
     WHERE o.id = $1 AND o.tenant_id = $2 AND o.deleted_at IS NULL`,
    [orderId, tenantId],
  );
  return result.rows[0] ?? null;
}

export async function createOrderFromQuote(
  quote: SalesQuote,
  tenantId: string,
  ownerId: string,
): Promise<SalesOrder> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const documentNumber = await allocateDocumentNumber(client, tenantId, 'ORDER');
    const result = await client.query<SalesOrder>(
      `INSERT INTO sales_orders (
         tenant_id, owner_id, quote_id, contact_id, deal_id, document_number, status,
         customer_company_name, customer_name, customer_vat_number, customer_tax_code,
         customer_email, customer_address, customer_sdi_code, customer_pec_email,
         subtotal, tax_total, total,
         default_tax_rate, currency, notes, order_date, issued_at
       ) VALUES ($1,$2,$3,$4,$5,$6,'CONFIRMED',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,CURRENT_DATE,NOW())
       RETURNING *`,
      [
        tenantId,
        ownerId,
        quote.id,
        quote.contact_id,
        quote.deal_id,
        documentNumber,
        quote.customer_company_name,
        quote.customer_name,
        quote.customer_vat_number,
        quote.customer_tax_code,
        quote.customer_email,
        quote.customer_address,
        quote.customer_sdi_code,
        quote.customer_pec_email,
        quote.subtotal,
        quote.tax_total,
        quote.total,
        quote.default_tax_rate,
        quote.currency,
        quote.notes,
      ],
    );
    const order = result.rows[0]!;
    const lines = await copyLines(client, tenantId, 'QUOTE', quote.id, 'ORDER', order.id);
    await updateParentTotals(client, 'sales_orders', order.id, tenantId, lines);
    await client.query(
      `UPDATE sales_quotes SET status = 'CONVERTED', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [quote.id, tenantId],
    );
    await client.query('COMMIT');
    return (await findOrderByIdAndTenant(order.id, tenantId))!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateOrderStatus(
  orderId: string,
  tenantId: string,
  status: OrderStatus,
): Promise<SalesOrder | null> {
  const result = await pool.query<SalesOrder>(
    `UPDATE sales_orders SET status = $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
     RETURNING *`,
    [status, orderId, tenantId],
  );
  return result.rows[0] ?? null;
}

// --- Delivery notes ---

export async function findDeliveryNotesByTenant(
  tenantId: string,
  filters?: SalesListFilters,
): Promise<SalesDeliveryNote[]> {
  const params: unknown[] = [tenantId];
  const limit = Math.min(filters?.limit ?? 200, 200);
  const filterSql = appendListFilters(
    filters,
    'd',
    ['d.document_number', 'd.customer_company_name', 'd.customer_name'],
    params,
  );
  params.push(limit);
  const result = await pool.query<SalesDeliveryNote>(
    `SELECT d.*,
       CASE WHEN c.id IS NOT NULL THEN TRIM(c.first_name || ' ' || c.last_name) END AS contact_name,
       o.document_number AS order_number
     FROM sales_delivery_notes d
     LEFT JOIN crm_contacts c ON c.id = d.contact_id
     LEFT JOIN sales_orders o ON o.id = d.order_id
     WHERE d.tenant_id = $1 AND d.deleted_at IS NULL${filterSql}
     ORDER BY d.created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return result.rows;
}

export async function findDeliveryNoteByIdAndTenant(
  deliveryNoteId: string,
  tenantId: string,
): Promise<SalesDeliveryNote | null> {
  const result = await pool.query<SalesDeliveryNote>(
    `SELECT d.*,
       CASE WHEN c.id IS NOT NULL THEN TRIM(c.first_name || ' ' || c.last_name) END AS contact_name,
       o.document_number AS order_number
     FROM sales_delivery_notes d
     LEFT JOIN crm_contacts c ON c.id = d.contact_id
     LEFT JOIN sales_orders o ON o.id = d.order_id
     WHERE d.id = $1 AND d.tenant_id = $2 AND d.deleted_at IS NULL`,
    [deliveryNoteId, tenantId],
  );
  return result.rows[0] ?? null;
}

export async function createDeliveryNoteFromOrder(
  order: SalesOrder,
  tenantId: string,
  ownerId: string,
  lineSelections?: LineQuantitySelection[],
): Promise<SalesDeliveryNote> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const documentNumber = await allocateDocumentNumber(client, tenantId, 'DELIVERY_NOTE');
    const result = await client.query<SalesDeliveryNote>(
      `INSERT INTO sales_delivery_notes (
         tenant_id, owner_id, order_id, contact_id, document_number, status,
         customer_company_name, customer_name, customer_vat_number, customer_tax_code,
         customer_email, customer_address, customer_sdi_code, customer_pec_email,
         subtotal, tax_total, total,
         default_tax_rate, currency, notes, issued_at
       ) VALUES ($1,$2,$3,$4,$5,'ISSUED',$6,$7,$8,$9,$10,$11,$12,$13,0,0,0,$14,$15,$16,NOW())
       RETURNING *`,
      [
        tenantId,
        ownerId,
        order.id,
        order.contact_id,
        documentNumber,
        order.customer_company_name,
        order.customer_name,
        order.customer_vat_number,
        order.customer_tax_code,
        order.customer_email,
        order.customer_address,
        order.customer_sdi_code,
        order.customer_pec_email,
        order.default_tax_rate,
        order.currency,
        order.notes,
      ],
    );
    const note = result.rows[0]!;
    const lines = await copyLinesWithSource(
      client,
      tenantId,
      'ORDER',
      order.id,
      'DELIVERY_NOTE',
      note.id,
      lineSelections,
    );
    if (!lines.length) throw new Error('NO_LINES_SELECTED');
    await updateParentTotals(client, 'sales_delivery_notes', note.id, tenantId, lines);
    await adjustStockForDeliveryNote(client, tenantId, lines);
    const fullyFulfilled = await isOrderFullyFulfilled(client, tenantId, order.id);
    await client.query(
      `UPDATE sales_orders SET status = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3`,
      [fullyFulfilled ? 'CONVERTED' : 'IN_PROGRESS', order.id, tenantId],
    );
    await client.query('COMMIT');
    return (await findDeliveryNoteByIdAndTenant(note.id, tenantId))!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateDeliveryNoteStatus(
  deliveryNoteId: string,
  tenantId: string,
  status: DeliveryNoteStatus,
): Promise<SalesDeliveryNote | null> {
  const result = await pool.query<SalesDeliveryNote>(
    `UPDATE sales_delivery_notes SET status = $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
     RETURNING *`,
    [status, deliveryNoteId, tenantId],
  );
  return result.rows[0] ?? null;
}

// --- Invoices ---

export async function findInvoicesByTenant(
  tenantId: string,
  filters?: SalesListFilters,
): Promise<SalesInvoice[]> {
  const params: unknown[] = [tenantId];
  const limit = Math.min(filters?.limit ?? 200, 200);
  const filterSql = appendListFilters(
    filters,
    'i',
    ['i.document_number', 'i.customer_company_name', 'i.customer_name'],
    params,
  );
  params.push(limit);
  const result = await pool.query<SalesInvoice>(
    `SELECT i.*,
       CASE WHEN c.id IS NOT NULL THEN TRIM(c.first_name || ' ' || c.last_name) END AS contact_name,
       d.document_number AS delivery_note_number
     FROM sales_invoices i
     LEFT JOIN crm_contacts c ON c.id = i.contact_id
     LEFT JOIN sales_delivery_notes d ON d.id = i.delivery_note_id
     WHERE i.tenant_id = $1 AND i.deleted_at IS NULL${filterSql}
     ORDER BY i.created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return result.rows;
}

export async function findInvoiceByIdAndTenant(
  invoiceId: string,
  tenantId: string,
): Promise<SalesInvoice | null> {
  const result = await pool.query<SalesInvoice>(
    `SELECT i.*,
       CASE WHEN c.id IS NOT NULL THEN TRIM(c.first_name || ' ' || c.last_name) END AS contact_name,
       d.document_number AS delivery_note_number
     FROM sales_invoices i
     LEFT JOIN crm_contacts c ON c.id = i.contact_id
     LEFT JOIN sales_delivery_notes d ON d.id = i.delivery_note_id
     WHERE i.id = $1 AND i.tenant_id = $2 AND i.deleted_at IS NULL`,
    [invoiceId, tenantId],
  );
  return result.rows[0] ?? null;
}

export async function createInvoiceFromDeliveryNote(
  note: SalesDeliveryNote,
  order: SalesOrder | null,
  tenantId: string,
  ownerId: string,
  options?: { paymentDays?: number; lineSelections?: LineQuantitySelection[]; asDraft?: boolean },
): Promise<SalesInvoice> {
  const paymentDays = options?.paymentDays ?? 30;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const documentNumber = await allocateDocumentNumber(client, tenantId, 'INVOICE');
    const invoiceStatus = options?.asDraft === false ? 'ISSUED' : 'DRAFT';
    const result = await client.query<SalesInvoice>(
      `INSERT INTO sales_invoices (
         tenant_id, owner_id, delivery_note_id, order_id, quote_id, contact_id,
         document_number, status, sdi_status,
         customer_company_name, customer_name, customer_vat_number, customer_tax_code,
         customer_email, customer_address, customer_sdi_code, customer_pec_email,
         subtotal, tax_total, total,
         default_tax_rate, currency, notes, invoice_date, due_date, issued_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'NOT_SENT',$9,$10,$11,$12,$13,$14,$15,$16,0,0,0,$17,$18,$19,CURRENT_DATE,CURRENT_DATE + ($20 || ' days')::interval,
         CASE WHEN $8 = 'ISSUED' THEN NOW() ELSE NULL END)
       RETURNING *`,
      [
        tenantId,
        ownerId,
        note.id,
        order?.id ?? note.order_id,
        order?.quote_id ?? null,
        note.contact_id,
        documentNumber,
        invoiceStatus,
        note.customer_company_name,
        note.customer_name,
        note.customer_vat_number,
        note.customer_tax_code,
        note.customer_email,
        note.customer_address,
        note.customer_sdi_code,
        note.customer_pec_email,
        note.default_tax_rate,
        note.currency,
        note.notes,
        paymentDays,
      ],
    );
    const invoice = result.rows[0]!;
    const lines = await copyLinesWithSource(
      client,
      tenantId,
      'DELIVERY_NOTE',
      note.id,
      'INVOICE',
      invoice.id,
      options?.lineSelections,
    );
    if (!lines.length) throw new Error('NO_LINES_SELECTED');
    await updateParentTotals(client, 'sales_invoices', invoice.id, tenantId, lines);
    const fullyInvoiced = await isDdtFullyInvoiced(client, tenantId, note.id);
    if (fullyInvoiced) {
      await client.query(
        `UPDATE sales_delivery_notes SET status = 'INVOICED', updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [note.id, tenantId],
      );
    }
    await client.query('COMMIT');
    return (await findInvoiceByIdAndTenant(invoice.id, tenantId))!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function createInvoiceFromOrder(
  order: SalesOrder,
  tenantId: string,
  ownerId: string,
  options?: { paymentDays?: number; lineSelections?: LineQuantitySelection[]; asDraft?: boolean },
): Promise<SalesInvoice> {
  const paymentDays = options?.paymentDays ?? 30;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const documentNumber = await allocateDocumentNumber(client, tenantId, 'INVOICE');
    const invoiceStatus = options?.asDraft === false ? 'ISSUED' : 'DRAFT';
    const result = await client.query<SalesInvoice>(
      `INSERT INTO sales_invoices (
         tenant_id, owner_id, delivery_note_id, order_id, quote_id, contact_id,
         document_number, status, sdi_status,
         customer_company_name, customer_name, customer_vat_number, customer_tax_code,
         customer_email, customer_address, customer_sdi_code, customer_pec_email,
         subtotal, tax_total, total,
         default_tax_rate, currency, notes, invoice_date, due_date, issued_at
       ) VALUES ($1,$2,NULL,$3,$4,$5,$6,$7,'NOT_SENT',$8,$9,$10,$11,$12,$13,$14,$15,0,0,0,$16,$17,$18,CURRENT_DATE,CURRENT_DATE + ($19 || ' days')::interval,
         CASE WHEN $7 = 'ISSUED' THEN NOW() ELSE NULL END)
       RETURNING *`,
      [
        tenantId,
        ownerId,
        order.id,
        order.quote_id,
        order.contact_id,
        documentNumber,
        invoiceStatus,
        order.customer_company_name,
        order.customer_name,
        order.customer_vat_number,
        order.customer_tax_code,
        order.customer_email,
        order.customer_address,
        order.customer_sdi_code,
        order.customer_pec_email,
        order.default_tax_rate,
        order.currency,
        order.notes,
        paymentDays,
      ],
    );
    const invoice = result.rows[0]!;
    const lines = await copyLinesWithSource(
      client,
      tenantId,
      'ORDER',
      order.id,
      'INVOICE',
      invoice.id,
      options?.lineSelections,
    );
    if (!lines.length) throw new Error('NO_LINES_SELECTED');
    await updateParentTotals(client, 'sales_invoices', invoice.id, tenantId, lines);
    await client.query('COMMIT');
    return (await findInvoiceByIdAndTenant(invoice.id, tenantId))!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateInvoice(
  invoiceId: string,
  tenantId: string,
  input: {
    customer: CustomerSnapshot;
    defaultTaxRate?: number;
    currency?: string;
    notes?: string | null;
    dueDate?: string | null;
    paymentDays?: number;
    lines: LineInput[];
  },
): Promise<SalesInvoice | null> {
  const existing = await findInvoiceByIdAndTenant(invoiceId, tenantId);
  if (!existing || existing.status !== 'DRAFT' || existing.sdi_status !== 'NOT_SENT') return null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const taxRate = input.defaultTaxRate ?? Number(existing.default_tax_rate);
    await client.query(
      `UPDATE sales_invoices SET
         customer_company_name = $3,
         customer_name = $4,
         customer_vat_number = $5,
         customer_tax_code = $6,
         customer_email = $7,
         customer_address = $8,
         customer_sdi_code = $9,
         customer_pec_email = $10,
         default_tax_rate = $11,
         currency = $12,
         notes = $13,
         due_date = COALESCE($14::date, due_date),
         updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status = 'DRAFT'`,
      [
        invoiceId,
        tenantId,
        input.customer.customerCompanyName,
        input.customer.customerName,
        input.customer.customerVatNumber,
        input.customer.customerTaxCode,
        input.customer.customerEmail,
        input.customer.customerAddress,
        input.customer.customerSdiCode,
        input.customer.customerPecEmail,
        taxRate,
        input.currency ?? existing.currency,
        input.notes ?? null,
        input.dueDate ?? null,
      ],
    );
    const lines = await replaceInvoiceLines(client, tenantId, invoiceId, input.lines, taxRate);
    await updateParentTotals(client, 'sales_invoices', invoiceId, tenantId, lines);
    await client.query('COMMIT');
    return findInvoiceByIdAndTenant(invoiceId, tenantId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function issueInvoice(invoiceId: string, tenantId: string): Promise<SalesInvoice | null> {
  const result = await pool.query<SalesInvoice>(
    `UPDATE sales_invoices SET status = 'ISSUED', issued_at = COALESCE(issued_at, NOW()), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL AND status = 'DRAFT'
     RETURNING *`,
    [invoiceId, tenantId],
  );
  return result.rows[0] ?? null;
}

export async function findOrderByQuoteId(
  quoteId: string,
  tenantId: string,
): Promise<SalesOrder | null> {
  const result = await pool.query<SalesOrder>(
    `SELECT * FROM sales_orders WHERE quote_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [quoteId, tenantId],
  );
  return result.rows[0] ?? null;
}

export async function updateInvoiceStatus(
  invoiceId: string,
  tenantId: string,
  status: InvoiceStatus,
): Promise<SalesInvoice | null> {
  const result = await pool.query<SalesInvoice>(
    `UPDATE sales_invoices SET status = $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
     RETURNING *`,
    [status, invoiceId, tenantId],
  );
  return result.rows[0] ?? null;
}
