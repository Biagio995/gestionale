CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id),
  company_name TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  job_title TEXT,
  status TEXT NOT NULL DEFAULT 'LEAD' CHECK (status IN ('LEAD', 'CUSTOMER', 'INACTIVE')),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant ON crm_contacts(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON crm_contacts(tenant_id, status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  stage TEXT NOT NULL DEFAULT 'LEAD' CHECK (stage IN ('LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST')),
  expected_close_date DATE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_deals_tenant ON crm_deals(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON crm_deals(tenant_id, stage) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_deals_contact ON crm_deals(contact_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK')),
  subject TEXT NOT NULL,
  body TEXT,
  due_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON crm_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_deal ON crm_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_tenant ON crm_activities(tenant_id);
