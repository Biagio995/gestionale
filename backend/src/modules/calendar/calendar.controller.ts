import type { Request, Response, NextFunction } from 'express';
import * as calendarService from './calendar.service.js';

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const events = await calendarService.listEvents(req.user!, req.query as Record<string, unknown>);
    res.json(events);
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
    const event = await calendarService.getEvent(req.user!, String(req.params.id));
    res.json(event);
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
    const event = await calendarService.createEvent(req.user!, req.body);
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const event = await calendarService.updateEvent(
      req.user!,
      String(req.params.id),
      req.body,
    );
    res.json(event);
  } catch (err) {
    next(err);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await calendarService.deleteEvent(req.user!, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
