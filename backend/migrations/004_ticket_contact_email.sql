ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

UPDATE support_tickets st
SET contact_email = u.email
FROM users u
WHERE st.created_by = u.id AND st.contact_email IS NULL;
