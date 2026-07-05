ALTER TABLE company_contracts
  ADD COLUMN IF NOT EXISTS document_url TEXT;

CREATE TABLE IF NOT EXISTS contract_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES company_contracts(id) ON DELETE CASCADE,
  renewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  previous_starts_at DATE NOT NULL,
  previous_ends_at DATE,
  previous_amount NUMERIC(12, 2),
  previous_status TEXT NOT NULL,
  new_starts_at DATE NOT NULL,
  new_ends_at DATE,
  new_amount NUMERIC(12, 2),
  notes TEXT,
  renewed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_renewals_contract
  ON contract_renewals (contract_id, renewed_at DESC);
