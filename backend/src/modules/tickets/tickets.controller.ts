import type { Request, Response, NextFunction } from 'express';
import * as ticketsService from './tickets.service.js';

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tickets = await ticketsService.listTickets(req.user!);
    res.json(tickets);
  } catch (err) {
    next(err);
  }
}

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ticket = await ticketsService.createTicket(req.user!, req.body);
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
}

export async function get(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await ticketsService.getTicket(req.user!, String(req.params.id));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function addMessage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const message = await ticketsService.addMessage(
      req.user!,
      String(req.params.id),
      req.body,
    );
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ticket = await ticketsService.updateStatus(
      req.user!,
      String(req.params.id),
      req.body,
    );
    res.json(ticket);
  } catch (err) {
    next(err);
  }
}

export async function tenantStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await ticketsService.getTenantStats(req.user!);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function listAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tickets = await ticketsService.listAllTickets(req.query);
    res.json(tickets);
  } catch (err) {
    next(err);
  }
}

export async function unreadCount(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const count = await ticketsService.countUnreadTickets();
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

export async function getAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await ticketsService.getTicketAdmin(String(req.params.id));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function addMessageAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const message = await ticketsService.addMessageAdmin(
      req.user!,
      String(req.params.id),
      req.body,
    );
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}

export async function updateStatusAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ticket = await ticketsService.updateStatusAdmin(
      String(req.params.id),
      req.body,
    );
    res.json(ticket);
  } catch (err) {
    next(err);
  }
}

export async function assignAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ticket = await ticketsService.assignTicketAdmin(
      String(req.params.id),
      req.body,
    );
    res.json(ticket);
  } catch (err) {
    next(err);
  }
}
