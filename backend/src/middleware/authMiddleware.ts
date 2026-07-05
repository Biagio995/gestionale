import type { NextFunction, Request, Response } from 'express';
import { pool } from '../db/pool.js';
import type { RequestContext } from '../types/index.js';
import { unauthorized } from '../utils/errors.js';
import { verifyToken } from '../utils/jwt.js';

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw unauthorized('errors.missingToken');
    }

    const token = header.slice(7);
    const payload = verifyToken(token);

    const result = await pool.query(
      `SELECT id, tenant_id, role, language, token_version, is_active FROM users WHERE id = $1`,
      [payload.userId],
    );

    const user = result.rows[0] as
      | {
          id: string;
          tenant_id: string;
          role: RequestContext['role'];
          language: RequestContext['language'];
          token_version: number;
          is_active: boolean;
        }
      | undefined;

    if (!user) {
      throw unauthorized('errors.invalidToken');
    }

    if (!user.is_active) {
      throw unauthorized('errors.userDeactivated');
    }

    if (user.tenant_id !== payload.tenantId) {
      throw unauthorized('errors.tenantMismatch');
    }

    if (user.token_version !== payload.tokenVersion) {
      throw unauthorized('errors.sessionRevoked');
    }

    req.user = {
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      language: user.language,
    };

    next();
  } catch (err) {
    next(err instanceof Error && 'statusCode' in err ? err : unauthorized('errors.invalidToken'));
  }
}

export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  void authMiddleware(req, _res, next);
}
