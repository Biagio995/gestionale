-- Platform tenant + super admin (password: Admin123!)
-- bcrypt hash generated for Admin123!
INSERT INTO tenants (id, name, status, contact_email)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Piattaforma MAIN',
  'ACTIVE',
  'support@gestionale.local'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, password_hash, tenant_id, role, language)
VALUES (
  'b0000000-0000-4000-8000-000000000001',
  'admin@gestionale.local',
  '$2b$12$.CBLw0mJ2M/IaIV0Fe/tHOk9TPI1I9Ax78gNabs9js4X.tvu2Wcym',
  'a0000000-0000-4000-8000-000000000001',
  'SUPER_ADMIN',
  'it'
)
ON CONFLICT (email) DO NOTHING;
