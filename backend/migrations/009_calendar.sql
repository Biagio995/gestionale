CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  owner_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'MEETING' CHECK (event_type IN ('CALL', 'MEETING', 'APPOINTMENT')),
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  location TEXT,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  company_name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  CONSTRAINT calendar_events_time_check CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_range
  ON calendar_events(tenant_id, starts_at, ends_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_owner
  ON calendar_events(tenant_id, owner_id)
  WHERE deleted_at IS NULL;
