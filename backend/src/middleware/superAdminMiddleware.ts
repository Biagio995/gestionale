import type { NextFunction, Request, Response } from 'express';
import { forbidden, unauthorized } from '../utils/errors.js';

export function superAdminMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    next(unauthorized());
    return;
  }
  if (req.user.role !== 'SUPER_ADMIN') {
    next(forbidden('errors.insufficientRole'));
    return;
  }
  next();
}
