ALTER TABLE tenant_fiscal_profiles
  ADD COLUMN IF NOT EXISTS default_payment_days INTEGER NOT NULL DEFAULT 30;

ALTER TABLE crm_contacts
  ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2);

ALTER TABLE sales_document_lines
  ADD COLUMN IF NOT EXISTS source_line_id UUID REFERENCES sales_document_lines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_lines_source
  ON sales_document_lines(source_line_id) WHERE source_line_id IS NOT NULL;
