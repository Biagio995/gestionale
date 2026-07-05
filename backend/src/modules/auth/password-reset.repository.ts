import { randomBytes } from 'crypto';
import { pool } from '../../db/pool.js';

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used_at: Date | null;
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function invalidateUserResetTokens(userId: string): Promise<void> {
  await pool.query(
    `UPDATE password_reset_tokens SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );
}

export async function createPasswordResetToken(
  userId: string,
  expiresInHours = 1,
): Promise<PasswordResetToken> {
  await invalidateUserResetTokens(userId);
  const token = generateToken();
  const result = await pool.query<PasswordResetToken>(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' hours')::interval)
     RETURNING *`,
    [userId, token, String(expiresInHours)],
  );
  return result.rows[0]!;
}

export async function findValidPasswordResetToken(
  token: string,
): Promise<PasswordResetToken | null> {
  const result = await pool.query<PasswordResetToken>(
    `SELECT * FROM password_reset_tokens
     WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [token],
  );
  return result.rows[0] ?? null;
}

export async function markPasswordResetTokenUsed(tokenId: string): Promise<void> {
  await pool.query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
    [tokenId],
  );
}
