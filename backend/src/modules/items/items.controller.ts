import type { Request, Response, NextFunction } from 'express';
import * as itemsService from './items.service.js';

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const items = await itemsService.listItems(req.user!, req.query);
    res.json(items);
  } catch (err) {
    next(err);
  }
}

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const item = await itemsService.getItem(req.user!, String(req.params.id));
    res.json(item);
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
    const item = await itemsService.createItem(req.user!, req.body);
    res.status(201).json(item);
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
    const item = await itemsService.updateItem(req.user!, String(req.params.id), req.body);
    res.json(item);
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
    await itemsService.deleteItem(req.user!, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
