-- Demo tenant fiscal profile and sample customer data for manual QA.
-- Account: demo@example.com / password123 (created via register or below)

DO $$
DECLARE
  demo_tenant_id UUID;
  demo_user_id UUID;
  demo_contact_id UUID := 'd1000000-0000-4000-8000-000000000001';
  demo_item_id UUID := 'd2000000-0000-4000-8000-000000000001';
BEGIN
  SELECT u.id, u.tenant_id
  INTO demo_user_id, demo_tenant_id
  FROM users u
  WHERE u.email = 'demo@example.com'
  LIMIT 1;

  IF demo_user_id IS NULL THEN
    INSERT INTO tenants (id, name, status, contact_email)
    VALUES (
      'd0000000-0000-4000-8000-000000000001',
      'Demo Srl',
      'ACTIVE',
      'demo@example.com'
    )
    ON CONFLICT (id) DO NOTHING;

    demo_tenant_id := 'd0000000-0000-4000-8000-000000000001';

    INSERT INTO users (id, email, password_hash, tenant_id, role, language)
    VALUES (
      'e0000000-0000-4000-8000-000000000001',
      'demo@example.com',
      '$2b$12$p7.FMSql99OyBYuWunAGDekYC9jbABzDNJUTgdQwV4bpd9WYRDiNC',
      demo_tenant_id,
      'ADMIN',
      'it'
    )
    ON CONFLICT (email) DO NOTHING;

    SELECT u.id, u.tenant_id
    INTO demo_user_id, demo_tenant_id
    FROM users u
    WHERE u.email = 'demo@example.com'
    LIMIT 1;
  END IF;

  IF demo_tenant_id IS NULL OR demo_user_id IS NULL THEN
    RAISE NOTICE 'demo@example.com not found; skipping demo fiscal seed';
    RETURN;
  END IF;

  UPDATE tenants
  SET name = 'Demo Srl', contact_email = 'demo@example.com', status = 'ACTIVE'
  WHERE id = demo_tenant_id;

  INSERT INTO tenant_fiscal_profiles (
    tenant_id,
    legal_name,
    vat_number,
    tax_code,
    fiscal_regime,
    address,
    city,
    zip_code,
    province,
    country,
    sdi_code,
    pec_email
  ) VALUES (
    demo_tenant_id,
    'Demo Srl',
    'IT12345678903',
    '12345678903',
    'RF01',
    'Via Roma 10',
    'Milano',
    '20121',
    'MI',
    'IT',
    'ABCDEF1',
    'fatture@demo.it'
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    legal_name = EXCLUDED.legal_name,
    vat_number = EXCLUDED.vat_number,
    tax_code = EXCLUDED.tax_code,
    fiscal_regime = EXCLUDED.fiscal_regime,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    zip_code = EXCLUDED.zip_code,
    province = EXCLUDED.province,
    country = EXCLUDED.country,
    sdi_code = EXCLUDED.sdi_code,
    pec_email = EXCLUDED.pec_email,
    updated_at = NOW();

  INSERT INTO crm_contacts (
    id,
    tenant_id,
    owner_id,
    company_name,
    first_name,
    last_name,
    email,
    phone,
    status,
    vat_number,
    tax_code,
    sdi_code,
    pec_email,
    notes
  ) VALUES (
    demo_contact_id,
    demo_tenant_id,
    demo_user_id,
    'Cliente Demo SPA',
    'Mario',
    'Rossi',
    'mario.rossi@cliente-demo.it',
    '+39 02 1234567',
    'CUSTOMER',
    'IT12345678903',
    'RSSMRA80A01H501U',
    'XYZAB12',
    'fatture@cliente-demo.pec.it',
    'Contatto demo con dati fiscali completi per test fatturazione e SDI.'
  )
  ON CONFLICT (id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    status = EXCLUDED.status,
    vat_number = EXCLUDED.vat_number,
    tax_code = EXCLUDED.tax_code,
    sdi_code = EXCLUDED.sdi_code,
    pec_email = EXCLUDED.pec_email,
    notes = EXCLUDED.notes,
    updated_at = NOW();

  INSERT INTO items (id, tenant_id, name, description)
  VALUES (
    demo_item_id,
    demo_tenant_id,
    'Consulenza commerciale',
    'Servizio demo per test preventivi e fatture.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW(),
    deleted_at = NULL;
END $$;
