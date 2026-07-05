import type { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service.js';

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.register(req.body, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.login(req.body, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await authService.getMe(req.user!);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function invitationPreview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const preview = await authService.getInvitationPreview(String(req.params.token));
    res.json(preview);
  } catch (err) {
    next(err);
  }
}

export async function acceptInvitation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.acceptInvitation(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.forgotPassword(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.resetPassword(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
