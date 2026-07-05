CREATE TABLE IF NOT EXISTS company_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  contract_number TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED')),
  starts_at DATE NOT NULL,
  ends_at DATE,
  signed_at DATE,
  amount NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  renewal_type TEXT NOT NULL DEFAULT 'NONE' CHECK (renewal_type IN ('NONE', 'MONTHLY', 'YEARLY')),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_company_contracts_tenant
  ON company_contracts (tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_company_contracts_end_date
  ON company_contracts (ends_at)
  WHERE deleted_at IS NULL;
