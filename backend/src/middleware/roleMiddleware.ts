import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../types/index.js';
import { forbidden, unauthorized } from '../utils/errors.js';

export function roleMiddleware(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized());
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(forbidden('errors.insufficientRole'));
      return;
    }

    next();
  };
}
