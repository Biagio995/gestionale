import type { NextFunction, Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { isPlatformTenant } from '../config/platform.js';
import { forbidden, unauthorized } from '../utils/errors.js';

export async function activeTenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user?.tenantId) {
    next(unauthorized('errors.tenantRequired'));
    return;
  }

  if (isPlatformTenant(req.user.tenantId)) {
    next();
    return;
  }

  const result = await pool.query<{ status: string }>(
    `SELECT status FROM tenants WHERE id = $1`,
    [req.user.tenantId],
  );

  const status = result.rows[0]?.status;
  if (!status) {
    next(forbidden('errors.tenantInvalid'));
    return;
  }

  if (status === 'SUSPENDED') {
    next(forbidden('errors.tenantSuspended'));
    return;
  }

  next();
}
