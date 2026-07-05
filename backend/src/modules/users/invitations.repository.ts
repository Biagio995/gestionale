import { randomBytes } from 'crypto';
import { pool } from '../../db/pool.js';
import type { Language, Role } from '../../types/index.js';

export interface Invitation {
  id: string;
  tenant_id: string;
  email: string;
  role: Role;
  token: string;
  invited_by: string;
  expires_at: Date;
  accepted_at: Date | null;
  created_at: Date;
}

export interface InvitationPreview {
  email: string;
  role: Role;
  tenant_name: string;
  expires_at: Date;
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createInvitation(input: {
  tenantId: string;
  email: string;
  role: Role;
  invitedBy: string;
  expiresInDays?: number;
}): Promise<Invitation> {
  const token = generateToken();
  const days = input.expiresInDays ?? 7;

  const result = await pool.query<Invitation>(
    `INSERT INTO invitations (tenant_id, email, role, token, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' days')::interval)
     RETURNING *`,
    [input.tenantId, input.email.toLowerCase(), input.role, token, input.invitedBy, String(days)],
  );
  return result.rows[0]!;
}

export async function findPendingInvitationByEmail(
  tenantId: string,
  email: string,
): Promise<Invitation | null> {
  const result = await pool.query<Invitation>(
    `SELECT * FROM invitations
     WHERE tenant_id = $1 AND email = $2 AND accepted_at IS NULL AND expires_at > NOW()`,
    [tenantId, email.toLowerCase()],
  );
  return result.rows[0] ?? null;
}

export interface PendingInvitationPublic {
  id: string;
  email: string;
  role: Role;
  expires_at: Date;
  created_at: Date;
}

export async function findPendingInvitationsByTenant(
  tenantId: string,
): Promise<PendingInvitationPublic[]> {
  const result = await pool.query<PendingInvitationPublic>(
    `SELECT id, email, role, expires_at, created_at
     FROM invitations
     WHERE tenant_id = $1 AND accepted_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [tenantId],
  );
  return result.rows;
}

export async function countPendingInvitationsByTenant(tenantId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM invitations
     WHERE tenant_id = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
    [tenantId],
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

export async function findInvitationByToken(token: string): Promise<Invitation | null> {
  const result = await pool.query<Invitation>(
    `SELECT * FROM invitations WHERE token = $1`,
    [token],
  );
  return result.rows[0] ?? null;
}

export async function getInvitationPreview(token: string): Promise<InvitationPreview | null> {
  const result = await pool.query<InvitationPreview>(
    `SELECT i.email, i.role, i.expires_at, t.name AS tenant_name
     FROM invitations i
     JOIN tenants t ON t.id = i.tenant_id
     WHERE i.token = $1 AND i.accepted_at IS NULL AND i.expires_at > NOW()`,
    [token],
  );
  return result.rows[0] ?? null;
}

export async function markInvitationAccepted(invitationId: string): Promise<void> {
  await pool.query(
    `UPDATE invitations SET accepted_at = NOW() WHERE id = $1`,
    [invitationId],
  );
}

export async function deletePendingInvitation(
  invitationId: string,
  tenantId: string,
): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM invitations
     WHERE id = $1 AND tenant_id = $2 AND accepted_at IS NULL`,
    [invitationId, tenantId],
  );
  return (result.rowCount ?? 0) > 0;
}
