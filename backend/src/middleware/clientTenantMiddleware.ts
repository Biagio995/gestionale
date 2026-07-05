import type { NextFunction, Request, Response } from 'express';
import { isPlatformTenant } from '../config/platform.js';
import { forbidden, unauthorized } from '../utils/errors.js';

/**
 * Blocca il tenant MAIN: l'assistenza è solo per le aziende clienti.
 * Il MAIN riceve ticket esclusivamente via /admin/tickets.
 */
export function clientTenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user?.tenantId) {
    next(unauthorized('errors.tenantRequired'));
    return;
  }

  if (isPlatformTenant(req.user.tenantId)) {
    next(forbidden('errors.platformTenantNoTickets'));
    return;
  }

  next();
}
