CREATE TABLE IF NOT EXISTS tenant_fiscal_profiles (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  vat_number TEXT NOT NULL,
  tax_code TEXT,
  fiscal_regime TEXT NOT NULL DEFAULT 'RF01',
  address TEXT,
  city TEXT,
  zip_code TEXT,
  province TEXT,
  country TEXT NOT NULL DEFAULT 'IT',
  sdi_code TEXT,
  pec_email TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_contacts
  ADD COLUMN IF NOT EXISTS vat_number TEXT,
  ADD COLUMN IF NOT EXISTS tax_code TEXT,
  ADD COLUMN IF NOT EXISTS sdi_code TEXT,
  ADD COLUMN IF NOT EXISTS pec_email TEXT;

ALTER TABLE sales_quotes
  ADD COLUMN IF NOT EXISTS customer_sdi_code TEXT,
  ADD COLUMN IF NOT EXISTS customer_pec_email TEXT;

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS customer_sdi_code TEXT,
  ADD COLUMN IF NOT EXISTS customer_pec_email TEXT;

ALTER TABLE sales_delivery_notes
  ADD COLUMN IF NOT EXISTS customer_sdi_code TEXT,
  ADD COLUMN IF NOT EXISTS customer_pec_email TEXT;

ALTER TABLE sales_invoices
  ADD COLUMN IF NOT EXISTS customer_sdi_code TEXT,
  ADD COLUMN IF NOT EXISTS customer_pec_email TEXT,
  ADD COLUMN IF NOT EXISTS sdi_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sdi_message_id TEXT,
  ADD COLUMN IF NOT EXISTS sdi_error TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'UNPAID'
    CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE')),
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS sales_passive_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  supplier_vat_number TEXT,
  supplier_tax_code TEXT,
  document_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  sdi_status TEXT NOT NULL DEFAULT 'RECEIVED'
    CHECK (sdi_status IN ('RECEIVED', 'ACCEPTED', 'REJECTED')),
  payment_status TEXT NOT NULL DEFAULT 'UNPAID'
    CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE')),
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_passive_invoices_tenant
  ON sales_passive_invoices(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sales_fiscal_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('INVOICE_ACTIVE', 'INVOICE_PASSIVE')),
  document_id UUID NOT NULL,
  xml_content TEXT NOT NULL,
  xml_hash TEXT NOT NULL,
  archived_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_fiscal_archives_doc
  ON sales_fiscal_archives(tenant_id, document_type, document_id);
