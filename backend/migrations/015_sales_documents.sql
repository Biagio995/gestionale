CREATE TABLE IF NOT EXISTS sales_document_sequences (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('QUOTE', 'ORDER', 'DELIVERY_NOTE', 'INVOICE')),
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, document_type, year)
);

CREATE TABLE IF NOT EXISTS sales_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE SET NULL,
  document_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'CONVERTED')),
  customer_company_name TEXT,
  customer_name TEXT,
  customer_vat_number TEXT,
  customer_tax_code TEXT,
  customer_email TEXT,
  customer_address TEXT,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  default_tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 22,
  currency TEXT NOT NULL DEFAULT 'EUR',
  notes TEXT,
  valid_until DATE,
  issued_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE (tenant_id, document_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_quotes_tenant ON sales_quotes(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id),
  quote_id UUID REFERENCES sales_quotes(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE SET NULL,
  document_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'FULFILLED', 'CANCELLED', 'CONVERTED')),
  customer_company_name TEXT,
  customer_name TEXT,
  customer_vat_number TEXT,
  customer_tax_code TEXT,
  customer_email TEXT,
  customer_address TEXT,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  default_tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 22,
  currency TEXT NOT NULL DEFAULT 'EUR',
  notes TEXT,
  order_date DATE,
  expected_delivery_date DATE,
  issued_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE (tenant_id, document_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant ON sales_orders(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_orders_quote ON sales_orders(quote_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sales_delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id),
  order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  document_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'INVOICED')),
  customer_company_name TEXT,
  customer_name TEXT,
  customer_vat_number TEXT,
  customer_tax_code TEXT,
  customer_email TEXT,
  customer_address TEXT,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  default_tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 22,
  currency TEXT NOT NULL DEFAULT 'EUR',
  notes TEXT,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  issued_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE (tenant_id, document_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_delivery_notes_tenant ON sales_delivery_notes(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_delivery_notes_order ON sales_delivery_notes(order_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id),
  delivery_note_id UUID REFERENCES sales_delivery_notes(id) ON DELETE SET NULL,
  order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES sales_quotes(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  document_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'SENT', 'PAID', 'CANCELLED')),
  sdi_status TEXT NOT NULL DEFAULT 'NOT_SENT' CHECK (sdi_status IN ('NOT_SENT', 'PENDING', 'ACCEPTED', 'REJECTED')),
  customer_company_name TEXT,
  customer_name TEXT,
  customer_vat_number TEXT,
  customer_tax_code TEXT,
  customer_email TEXT,
  customer_address TEXT,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  default_tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 22,
  currency TEXT NOT NULL DEFAULT 'EUR',
  notes TEXT,
  invoice_date DATE,
  due_date DATE,
  payment_method TEXT,
  issued_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE (tenant_id, document_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_tenant ON sales_invoices(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sales_document_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_type TEXT NOT NULL CHECK (parent_type IN ('QUOTE', 'ORDER', 'DELIVERY_NOTE', 'INVOICE')),
  parent_id UUID NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 22,
  line_subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_lines_parent ON sales_document_lines(tenant_id, parent_type, parent_id);
