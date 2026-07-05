import { pool } from '../../db/pool.js';
import type { Language, Role, UserPublic } from '../../types/index.js';

export async function updateUserLanguage(
  userId: string,
  tenantId: string,
  language: Language,
): Promise<UserPublic | null> {
  const result = await pool.query<UserPublic>(
    `UPDATE users SET language = $1
     WHERE id = $2 AND tenant_id = $3 AND is_active = TRUE
     RETURNING id, email, tenant_id, role, language, created_at`,
    [language, userId, tenantId],
  );
  return result.rows[0] ?? null;
}

export async function findUsersByTenant(tenantId: string): Promise<UserPublic[]> {
  const result = await pool.query<UserPublic>(
    `SELECT id, email, tenant_id, role, language, created_at
     FROM users WHERE tenant_id = $1 AND is_active = TRUE
     ORDER BY created_at ASC`,
    [tenantId],
  );
  return result.rows;
}

export async function findUserByIdAndTenant(
  userId: string,
  tenantId: string,
): Promise<UserPublic | null> {
  const result = await pool.query<UserPublic>(
    `SELECT id, email, tenant_id, role, language, created_at
     FROM users WHERE id = $1 AND tenant_id = $2 AND is_active = TRUE`,
    [userId, tenantId],
  );
  return result.rows[0] ?? null;
}

export interface CreateTenantUserInput {
  email: string;
  passwordHash: string;
  tenantId: string;
  role: Role;
  language: Language;
}

export async function createTenantUser(input: CreateTenantUserInput): Promise<UserPublic> {
  const result = await pool.query<UserPublic>(
    `INSERT INTO users (email, password_hash, tenant_id, role, language)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, tenant_id, role, language, created_at`,
    [input.email.toLowerCase(), input.passwordHash, input.tenantId, input.role, input.language],
  );
  return result.rows[0]!;
}

export async function updateUserRole(
  userId: string,
  tenantId: string,
  role: Role,
): Promise<UserPublic | null> {
  const result = await pool.query<UserPublic>(
    `UPDATE users SET role = $1
     WHERE id = $2 AND tenant_id = $3
     RETURNING id, email, tenant_id, role, language, created_at`,
    [role, userId, tenantId],
  );
  return result.rows[0] ?? null;
}

export async function getTenantName(tenantId: string): Promise<string | null> {
  const result = await pool.query<{ name: string }>(
    `SELECT name FROM tenants WHERE id = $1`,
    [tenantId],
  );
  return result.rows[0]?.name ?? null;
}

export async function deactivateUser(
  userId: string,
  tenantId: string,
): Promise<UserPublic | null> {
  const result = await pool.query<UserPublic>(
    `UPDATE users
     SET is_active = FALSE,
         deactivated_at = NOW(),
         token_version = token_version + 1
     WHERE id = $1 AND tenant_id = $2 AND is_active = TRUE
     RETURNING id, email, tenant_id, role, language, created_at`,
    [userId, tenantId],
  );
  return result.rows[0] ?? null;
}

export async function countActiveUsersByRole(
  tenantId: string,
  role: Role,
): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users
     WHERE tenant_id = $1 AND role = $2 AND is_active = TRUE`,
    [tenantId, role],
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

export async function countActiveUsers(tenantId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users
     WHERE tenant_id = $1 AND is_active = TRUE`,
    [tenantId],
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

export interface UserOnboardingState {
  dismissed: boolean;
  languageConfigured: boolean;
}

export async function getUserOnboardingState(
  userId: string,
  tenantId: string,
): Promise<UserOnboardingState> {
  const result = await pool.query<{ onboarding_state: UserOnboardingState }>(
    `SELECT onboarding_state FROM users
     WHERE id = $1 AND tenant_id = $2 AND is_active = TRUE`,
    [userId, tenantId],
  );
  const state = result.rows[0]?.onboarding_state;
  return {
    dismissed: state?.dismissed ?? false,
    languageConfigured: state?.languageConfigured ?? false,
  };
}

export async function markLanguageConfigured(
  userId: string,
  tenantId: string,
): Promise<void> {
  await pool.query(
    `UPDATE users
     SET onboarding_state = jsonb_set(
       COALESCE(onboarding_state, '{}'::jsonb),
       '{languageConfigured}',
       'true'::jsonb,
       true
     )
     WHERE id = $1 AND tenant_id = $2`,
    [userId, tenantId],
  );
}

export async function dismissOnboarding(
  userId: string,
  tenantId: string,
): Promise<void> {
  await pool.query(
    `UPDATE users
     SET onboarding_state = jsonb_set(
       COALESCE(onboarding_state, '{}'::jsonb),
       '{dismissed}',
       'true'::jsonb,
       true
     )
     WHERE id = $1 AND tenant_id = $2`,
    [userId, tenantId],
  );
}
