CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'USER')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_tenant_id ON invitations(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_pending_email
  ON invitations(tenant_id, email) WHERE accepted_at IS NULL;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS unread_by_staff BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_support_tickets_unread ON support_tickets(unread_by_staff)
  WHERE unread_by_staff = TRUE AND status IN ('OPEN', 'IN_PROGRESS', 'WAITING');
