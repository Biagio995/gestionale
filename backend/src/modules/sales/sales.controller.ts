import type { Request, Response, NextFunction } from 'express';
import * as salesService from './sales.service.js';

export async function stats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await salesService.getStats(req.user!));
  } catch (err) {
    next(err);
  }
}

export async function listQuotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await salesService.listQuotes(req.user!, req.query));
  } catch (err) {
    next(err);
  }
}

export async function getQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await salesService.getQuote(req.user!, String(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function createQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const quote = await salesService.createQuote(req.user!, req.body);
    res.status(201).json(quote);
  } catch (err) {
    next(err);
  }
}

export async function updateQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await salesService.updateQuote(req.user!, String(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
}

export async function updateQuoteStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json(await salesService.updateQuoteStatus(req.user!, String(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
}

export async function deleteQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await salesService.deleteQuote(req.user!, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function convertQuoteToOrder(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const order = await salesService.convertQuoteToOrder(req.user!, String(req.params.id));
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await salesService.listOrders(req.user!, req.query));
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await salesService.getOrder(req.user!, String(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json(await salesService.updateOrderStatus(req.user!, String(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
}

export async function convertOrderToDeliveryNote(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const note = await salesService.convertOrderToDeliveryNote(
      req.user!,
      String(req.params.id),
      req.body,
    );
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
}

export async function listDeliveryNotes(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json(await salesService.listDeliveryNotes(req.user!, req.query));
  } catch (err) {
    next(err);
  }
}

export async function getDeliveryNote(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json(await salesService.getDeliveryNote(req.user!, String(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function updateDeliveryNoteStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json(
      await salesService.updateDeliveryNoteStatus(req.user!, String(req.params.id), req.body),
    );
  } catch (err) {
    next(err);
  }
}

export async function convertDeliveryNoteToInvoice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const invoice = await salesService.convertDeliveryNoteToInvoice(
      req.user!,
      String(req.params.id),
      req.body,
    );
    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function listInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await salesService.listInvoices(req.user!, req.query));
  } catch (err) {
    next(err);
  }
}

export async function listContactDocuments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json(await salesService.listContactDocuments(req.user!, String(req.params.contactId)));
  } catch (err) {
    next(err);
  }
}

export async function getInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await salesService.getInvoice(req.user!, String(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function updateInvoiceStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json(await salesService.updateInvoiceStatus(req.user!, String(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
}

export async function convertOrderToInvoice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const invoice = await salesService.convertOrderToInvoice(
      req.user!,
      String(req.params.id),
      req.body,
    );
    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function convertQuoteToInvoice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const invoice = await salesService.convertQuoteToInvoice(
      req.user!,
      String(req.params.id),
      req.body,
    );
    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function updateInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await salesService.updateInvoice(req.user!, String(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
}

export async function issueInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await salesService.issueInvoice(req.user!, String(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function getPipeline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await salesService.getPipeline(req.user!));
  } catch (err) {
    next(err);
  }
}
