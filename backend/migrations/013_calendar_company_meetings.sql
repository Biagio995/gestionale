ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS target_tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_calendar_events_target_tenant
  ON calendar_events (target_tenant_id, starts_at)
  WHERE deleted_at IS NULL AND target_tenant_id IS NOT NULL;
