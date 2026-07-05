import type { Request, Response, NextFunction } from 'express';
import * as documentExport from './documentExport.service.js';
import * as fiscalService from './fiscal.service.js';
import type { DocumentPdfKind } from './documentPdf.generator.js';

async function sendPdf(
  res: Response,
  kind: DocumentPdfKind,
  context: NonNullable<Request['user']>,
  documentId: string,
): Promise<void> {
  const { buffer, filename } = await documentExport.getDocumentPdf(context, kind, documentId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await fiscalService.getFiscalProfile(req.user!));
  } catch (err) {
    next(err);
  }
}

export async function saveProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await fiscalService.saveFiscalProfile(req.user!, req.body));
  } catch (err) {
    next(err);
  }
}

export async function validateVat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await fiscalService.validateVat(req.body));
  } catch (err) {
    next(err);
  }
}

export async function fiscalDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await fiscalService.getFiscalDashboard(req.user!));
  } catch (err) {
    next(err);
  }
}

export async function sendSdi(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await fiscalService.sendInvoiceToSdi(req.user!, String(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function getXml(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await fiscalService.getInvoiceXml(req.user!, String(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await fiscalService.recordInvoicePayment(req.user!, String(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
}

export async function listPassive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await fiscalService.listPassiveInvoices(req.user!));
  } catch (err) {
    next(err);
  }
}

export async function createPassive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await fiscalService.createPassiveInvoice(req.user!, req.body);
    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function recordPassivePayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json(
      await fiscalService.recordPassiveInvoicePayment(req.user!, String(req.params.id), req.body),
    );
  } catch (err) {
    next(err);
  }
}

export async function scadenzario(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await fiscalService.getScadenzario(req.user!));
  } catch (err) {
    next(err);
  }
}

export async function importPassiveXml(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await fiscalService.importPassiveInvoiceXml(req.user!, req.body);
    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function getQuotePdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await sendPdf(res, 'QUOTE', req.user!, String(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function getOrderPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await sendPdf(res, 'ORDER', req.user!, String(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function getDeliveryNotePdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await sendPdf(res, 'DELIVERY_NOTE', req.user!, String(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function getInvoicePdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await sendPdf(res, 'INVOICE', req.user!, String(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function emailQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await documentExport.emailDocument(req.user!, 'QUOTE', String(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
}

export async function emailOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await documentExport.emailDocument(req.user!, 'ORDER', String(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
}

export async function emailDeliveryNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(
      await documentExport.emailDocument(req.user!, 'DELIVERY_NOTE', String(req.params.id), req.body),
    );
  } catch (err) {
    next(err);
  }
}

export async function emailInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(
      await documentExport.emailDocument(req.user!, 'INVOICE', String(req.params.id), req.body),
    );
  } catch (err) {
    next(err);
  }
}
