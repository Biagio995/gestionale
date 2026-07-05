import type { Request, Response, NextFunction } from 'express';
import type { ContactStatus, DealStage } from './crm.repository.js';
import * as crmService from './crm.service.js';

export async function stats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await crmService.getStats(req.user!);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function listContacts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const status = req.query.status as ContactStatus | undefined;
    const contacts = await crmService.listContacts(req.user!, status);
    res.json(contacts);
  } catch (err) {
    next(err);
  }
}

export async function getContact(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await crmService.getContact(req.user!, String(req.params.id));
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function createContact(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const contact = await crmService.createContact(req.user!, req.body);
    res.status(201).json(contact);
  } catch (err) {
    next(err);
  }
}

export async function updateContact(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const contact = await crmService.updateContact(
      req.user!,
      String(req.params.id),
      req.body,
    );
    res.json(contact);
  } catch (err) {
    next(err);
  }
}

export async function deleteContact(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await crmService.deleteContact(req.user!, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function listDeals(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stage = req.query.stage as DealStage | undefined;
    const contactId = req.query.contactId as string | undefined;
    const deals = await crmService.listDeals(req.user!, { stage, contactId });
    res.json(deals);
  } catch (err) {
    next(err);
  }
}

export async function createDeal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const deal = await crmService.createDeal(req.user!, req.body);
    res.status(201).json(deal);
  } catch (err) {
    next(err);
  }
}

export async function updateDeal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const deal = await crmService.updateDeal(req.user!, String(req.params.id), req.body);
    res.json(deal);
  } catch (err) {
    next(err);
  }
}

export async function deleteDeal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await crmService.deleteDeal(req.user!, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function createActivity(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const activity = await crmService.createActivity(req.user!, req.body);
    res.status(201).json(activity);
  } catch (err) {
    next(err);
  }
}
