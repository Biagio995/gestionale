import type { NextFunction, Request, Response } from 'express';
import { forbidden, unauthorized } from '../utils/errors.js';

export function tenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.tenantId) {
    next(unauthorized('errors.tenantRequired'));
    return;
  }
  next();
}

export function assertTenantResource(
  resourceTenantId: string,
  contextTenantId: string,
): void {
  if (resourceTenantId !== contextTenantId) {
    throw forbidden('errors.tenantMismatch');
  }
}
