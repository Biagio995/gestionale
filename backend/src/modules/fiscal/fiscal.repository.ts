import { pool } from '../../db/pool.js';
import type { SalesDocumentLine, SalesInvoice } from '../sales/sales.repository.js';

export interface TenantFiscalProfile {
  tenant_id: string;
  legal_name: string;
  vat_number: string;
  tax_code: string | null;
  fiscal_regime: string;
  address: string | null;
  city: string | null;
  zip_code: string | null;
  province: string | null;
  country: string;
  sdi_code: string | null;
  pec_email: string | null;
  default_payment_days: number;
  created_at: Date;
  updated_at: Date;
}

export interface PassiveInvoice {
  id: string;
  tenant_id: string;
  supplier_name: string;
  supplier_vat_number: string | null;
  supplier_tax_code: string | null;
  document_number: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: string;
  tax_total: string;
  total: string;
  currency: string;
  sdi_status: string;
  payment_status: string;
  paid_amount: string;
  paid_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function findFiscalProfile(tenantId: string): Promise<TenantFiscalProfile | null> {
  const result = await pool.query<TenantFiscalProfile>(
    `SELECT * FROM tenant_fiscal_profiles WHERE tenant_id = $1`,
    [tenantId],
  );
  return result.rows[0] ?? null;
}

export async function upsertFiscalProfile(
  tenantId: string,
  input: {
    legalName: string;
    vatNumber: string;
    taxCode?: string | null;
    fiscalRegime?: string;
    address?: string | null;
    city?: string | null;
    zipCode?: string | null;
    province?: string | null;
    country?: string;
    sdiCode?: string | null;
    pecEmail?: string | null;
    defaultPaymentDays?: number;
  },
): Promise<TenantFiscalProfile> {
  const result = await pool.query<TenantFiscalProfile>(
    `INSERT INTO tenant_fiscal_profiles (
       tenant_id, legal_name, vat_number, tax_code, fiscal_regime,
       address, city, zip_code, province, country, sdi_code, pec_email, default_payment_days
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (tenant_id) DO UPDATE SET
       legal_name = EXCLUDED.legal_name,
       vat_number = EXCLUDED.vat_number,
       tax_code = EXCLUDED.tax_code,
       fiscal_regime = EXCLUDED.fiscal_regime,
       address = EXCLUDED.address,
       city = EXCLUDED.city,
       zip_code = EXCLUDED.zip_code,
       province = EXCLUDED.province,
       country = EXCLUDED.country,
       sdi_code = EXCLUDED.sdi_code,
       pec_email = EXCLUDED.pec_email,
       default_payment_days = EXCLUDED.default_payment_days,
       updated_at = NOW()
     RETURNING *`,
    [
      tenantId,
      input.legalName,
      input.vatNumber,
      input.taxCode ?? null,
      input.fiscalRegime ?? 'RF01',
      input.address ?? null,
      input.city ?? null,
      input.zipCode ?? null,
      input.province ?? null,
      input.country ?? 'IT',
      input.sdiCode ?? null,
      input.pecEmail ?? null,
      input.defaultPaymentDays ?? 30,
    ],
  );
  return result.rows[0]!;
}

export async function archiveFiscalXml(input: {
  tenantId: string;
  documentType: 'INVOICE_ACTIVE' | 'INVOICE_PASSIVE';
  documentId: string;
  xmlContent: string;
  xmlHash: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO sales_fiscal_archives (tenant_id, document_type, document_id, xml_content, xml_hash)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.tenantId, input.documentType, input.documentId, input.xmlContent, input.xmlHash],
  );
}

export async function findInvoiceArchive(
  tenantId: string,
  invoiceId: string,
): Promise<{ xml_content: string } | null> {
  const result = await pool.query<{ xml_content: string }>(
    `SELECT xml_content FROM sales_fiscal_archives
     WHERE tenant_id = $1 AND document_type = 'INVOICE_ACTIVE' AND document_id = $2
     ORDER BY archived_at DESC LIMIT 1`,
    [tenantId, invoiceId],
  );
  return result.rows[0] ?? null;
}

export async function updateInvoiceSdiResult(
  invoiceId: string,
  tenantId: string,
  input: {
    sdiStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    sdiMessageId?: string | null;
    sdiError?: string | null;
    status?: 'ISSUED' | 'SENT';
  },
): Promise<SalesInvoice | null> {
  const result = await pool.query<SalesInvoice>(
    `UPDATE sales_invoices
     SET sdi_status = $1,
         sdi_message_id = COALESCE($2, sdi_message_id),
         sdi_error = $3,
         sdi_sent_at = CASE WHEN $1 IN ('PENDING', 'ACCEPTED') THEN COALESCE(sdi_sent_at, NOW()) ELSE sdi_sent_at END,
         status = COALESCE($4, status),
         updated_at = NOW()
     WHERE id = $5 AND tenant_id = $6 AND deleted_at IS NULL
     RETURNING *`,
    [
      input.sdiStatus,
      input.sdiMessageId ?? null,
      input.sdiError ?? null,
      input.status ?? null,
      invoiceId,
      tenantId,
    ],
  );
  return result.rows[0] ?? null;
}

export async function updateInvoicePayment(
  invoiceId: string,
  tenantId: string,
  input: { paidAmount: number; paidAt?: Date | null },
): Promise<SalesInvoice | null> {
  const result = await pool.query<SalesInvoice>(
    `UPDATE sales_invoices
     SET paid_amount = $1::numeric,
         paid_at = $2,
         payment_status = CASE
           WHEN $1::numeric <= 0 THEN 'UNPAID'
           WHEN $1::numeric >= total THEN 'PAID'
           ELSE 'PARTIAL'
         END,
         status = CASE WHEN $1::numeric >= total THEN 'PAID' ELSE status END,
         updated_at = NOW()
     WHERE id = $3 AND tenant_id = $4 AND deleted_at IS NULL
     RETURNING *`,
    [input.paidAmount, input.paidAt ?? new Date(), invoiceId, tenantId],
  );
  return result.rows[0] ?? null;
}

export async function markOverdueInvoices(tenantId: string): Promise<number> {
  const result = await pool.query(
    `UPDATE sales_invoices
     SET payment_status = 'OVERDUE', updated_at = NOW()
     WHERE tenant_id = $1
       AND deleted_at IS NULL
       AND payment_status IN ('UNPAID', 'PARTIAL')
       AND due_date IS NOT NULL
       AND due_date < CURRENT_DATE`,
    [tenantId],
  );
  return result.rowCount ?? 0;
}

export async function findPassiveInvoicesByTenant(tenantId: string): Promise<PassiveInvoice[]> {
  const result = await pool.query<PassiveInvoice>(
    `SELECT * FROM sales_passive_invoices
     WHERE tenant_id = $1 AND deleted_at IS NULL
     ORDER BY invoice_date DESC`,
    [tenantId],
  );
  return result.rows;
}

export async function createPassiveInvoice(
  tenantId: string,
  input: {
    supplierName: string;
    supplierVatNumber?: string | null;
    supplierTaxCode?: string | null;
    documentNumber: string;
    invoiceDate: string;
    dueDate?: string | null;
    subtotal?: number;
    taxTotal?: number;
    total: number;
    currency?: string;
    notes?: string | null;
  },
): Promise<PassiveInvoice> {
  const result = await pool.query<PassiveInvoice>(
    `INSERT INTO sales_passive_invoices (
       tenant_id, supplier_name, supplier_vat_number, supplier_tax_code,
       document_number, invoice_date, due_date, subtotal, tax_total, total, currency, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      tenantId,
      input.supplierName,
      input.supplierVatNumber ?? null,
      input.supplierTaxCode ?? null,
      input.documentNumber,
      input.invoiceDate,
      input.dueDate ?? null,
      input.subtotal ?? input.total,
      input.taxTotal ?? 0,
      input.total,
      input.currency ?? 'EUR',
      input.notes ?? null,
    ],
  );
  return result.rows[0]!;
}

export async function updatePassiveInvoicePayment(
  passiveInvoiceId: string,
  tenantId: string,
  paidAmount: number,
): Promise<PassiveInvoice | null> {
  const result = await pool.query<PassiveInvoice>(
    `UPDATE sales_passive_invoices
     SET paid_amount = $1::numeric,
         paid_at = NOW(),
         payment_status = CASE
           WHEN $1::numeric <= 0 THEN 'UNPAID'
           WHEN $1::numeric >= total THEN 'PAID'
           ELSE 'PARTIAL'
         END,
         updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
     RETURNING *`,
    [paidAmount, passiveInvoiceId, tenantId],
  );
  return result.rows[0] ?? null;
}

export interface ScadenzarioEntry {
  id: string;
  entry_type: 'ACTIVE' | 'PASSIVE';
  counterparty: string;
  document_number: string;
  due_date: string;
  total: string;
  currency: string;
  payment_status: string;
  paid_amount: string;
}

export async function findScadenzario(tenantId: string): Promise<ScadenzarioEntry[]> {
  const result = await pool.query<ScadenzarioEntry>(
    `SELECT id, 'ACTIVE'::text AS entry_type,
       COALESCE(customer_company_name, customer_name, '—') AS counterparty,
       document_number, due_date::text, total::text, currency,
       payment_status, paid_amount::text
     FROM sales_invoices
     WHERE tenant_id = $1 AND deleted_at IS NULL
       AND payment_status IN ('UNPAID', 'PARTIAL', 'OVERDUE')
       AND due_date IS NOT NULL
     UNION ALL
     SELECT id, 'PASSIVE',
       supplier_name, document_number, COALESCE(due_date, invoice_date)::text,
       total::text, currency, payment_status, paid_amount::text
     FROM sales_passive_invoices
     WHERE tenant_id = $1 AND deleted_at IS NULL
       AND payment_status IN ('UNPAID', 'PARTIAL', 'OVERDUE')
     ORDER BY due_date ASC`,
    [tenantId],
  );
  return result.rows;
}

export async function getInvoiceWithLines(
  invoiceId: string,
  tenantId: string,
): Promise<{ invoice: SalesInvoice; lines: SalesDocumentLine[] } | null> {
  const invoiceResult = await pool.query<SalesInvoice>(
    `SELECT * FROM sales_invoices WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [invoiceId, tenantId],
  );
  const invoice = invoiceResult.rows[0];
  if (!invoice) return null;
  const linesResult = await pool.query<SalesDocumentLine>(
    `SELECT * FROM sales_document_lines
     WHERE tenant_id = $1 AND parent_type = 'INVOICE' AND parent_id = $2
     ORDER BY sort_order ASC, created_at ASC`,
    [tenantId, invoiceId],
  );
  return { invoice, lines: linesResult.rows };
}
