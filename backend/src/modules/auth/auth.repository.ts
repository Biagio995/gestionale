import { pool } from '../../db/pool.js';
import type { Language, Role, Tenant, User, UserPublic } from '../../types/index.js';
import type { PoolClient } from 'pg';

export interface CreateTenantInput {
  name: string;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  tenantId: string;
  role: Role;
  language: Language;
}

export interface RegisterTenantAdminInput {
  tenantName: string;
  email: string;
  passwordHash: string;
  language: Language;
}

export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const result = await pool.query<Tenant>(
    `INSERT INTO tenants (name) VALUES ($1) RETURNING *`,
    [input.name],
  );
  return result.rows[0]!;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT * FROM users WHERE email = $1`,
    [email.toLowerCase()],
  );
  return result.rows[0] ?? null;
}

export async function findActiveUserById(userId: string): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT * FROM users WHERE id = $1 AND is_active = TRUE`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function findUserById(userId: string): Promise<UserPublic | null> {
  const result = await pool.query<UserPublic>(
    `SELECT id, email, tenant_id, role, language, created_at FROM users WHERE id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
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

export async function updatePassword(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await pool.query(
    `UPDATE users
     SET password_hash = $1, token_version = token_version + 1
     WHERE id = $2 AND is_active = TRUE`,
    [passwordHash, userId],
  );
}

export async function getUserTokenVersion(userId: string): Promise<number | null> {
  const result = await pool.query<{ token_version: number }>(
    `SELECT token_version FROM users WHERE id = $1 AND is_active = TRUE`,
    [userId],
  );
  return result.rows[0]?.token_version ?? null;
}

export async function createUser(input: CreateUserInput): Promise<UserPublic> {
  const result = await pool.query<UserPublic>(
    `INSERT INTO users (email, password_hash, tenant_id, role, language)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, tenant_id, role, language, created_at`,
    [input.email.toLowerCase(), input.passwordHash, input.tenantId, input.role, input.language],
  );
  return result.rows[0]!;
}

async function createTenantWithClient(
  client: PoolClient,
  input: CreateTenantInput,
): Promise<Tenant> {
  const result = await client.query<Tenant>(
    `INSERT INTO tenants (name) VALUES ($1) RETURNING *`,
    [input.name],
  );
  return result.rows[0]!;
}

async function createUserWithClient(
  client: PoolClient,
  input: CreateUserInput,
): Promise<User> {
  const result = await client.query<User>(
    `INSERT INTO users (email, password_hash, tenant_id, role, language)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.email.toLowerCase(), input.passwordHash, input.tenantId, input.role, input.language],
  );
  return result.rows[0]!;
}

export async function registerTenantAdmin(input: RegisterTenantAdminInput): Promise<{
  tenant: Tenant;
  user: User;
}> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tenant = await createTenantWithClient(client, { name: input.tenantName });
    const user = await createUserWithClient(client, {
      email: input.email,
      passwordHash: input.passwordHash,
      tenantId: tenant.id,
      role: 'ADMIN',
      language: input.language,
    });

    await client.query('COMMIT');
    return { tenant, user };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function tenantExists(tenantId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM tenants WHERE id = $1`,
    [tenantId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getTenantStatus(
  tenantId: string,
): Promise<{ status: string } | null> {
  const result = await pool.query<{ status: string }>(
    `SELECT status FROM tenants WHERE id = $1`,
    [tenantId],
  );
  return result.rows[0] ?? null;
}
