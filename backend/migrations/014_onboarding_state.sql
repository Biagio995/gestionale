ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_state JSONB NOT NULL
  DEFAULT '{"dismissed": false, "languageConfigured": false}'::jsonb;
