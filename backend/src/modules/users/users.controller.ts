import type { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service.js';

export async function updateLanguage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await usersService.updateLanguage(req.user!, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function getOnboarding(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const status = await usersService.getOnboardingStatus(req.user!);
    res.json(status);
  } catch (err) {
    next(err);
  }
}

export async function dismissOnboarding(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const status = await usersService.dismissOnboarding(req.user!);
    res.json(status);
  } catch (err) {
    next(err);
  }
}

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const users = await usersService.listUsers(req.user!);
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function listPendingInvitations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const invitations = await usersService.listPendingInvitations(req.user!);
    res.json(invitations);
  } catch (err) {
    next(err);
  }
}

export async function cancelInvitation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await usersService.cancelInvitation(req.user!, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function deactivate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await usersService.deactivateUser(req.user!, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function invite(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await usersService.inviteUser(req.user!, req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await usersService.updateRole(
      req.user!,
      String(req.params.id),
      req.body,
    );
    res.json(user);
  } catch (err) {
    next(err);
  }
}
