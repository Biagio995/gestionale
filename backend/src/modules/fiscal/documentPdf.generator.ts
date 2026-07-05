import PDFDocument from 'pdfkit';
import type { SalesDocumentLine } from '../sales/sales.repository.js';
import type { FiscalParty } from './fatturapa.generator.js';

export type DocumentPdfKind = 'QUOTE' | 'ORDER' | 'DELIVERY_NOTE' | 'INVOICE';

const KIND_LABELS: Record<DocumentPdfKind, string> = {
  QUOTE: 'PREVENTIVO',
  ORDER: 'ORDINE',
  DELIVERY_NOTE: 'DOCUMENTO DI TRASPORTO',
  INVOICE: 'FATTURA',
};

export interface DocumentPdfInput {
  kind: DocumentPdfKind;
  documentNumber: string;
  documentDate: string;
  supplier: FiscalParty;
  customer: {
    companyName?: string | null;
    name?: string | null;
    vatNumber?: string | null;
    taxCode?: string | null;
    email?: string | null;
    address?: string | null;
    sdiCode?: string | null;
    pecEmail?: string | null;
  };
  lines: SalesDocumentLine[];
  subtotal: string;
  taxTotal: string;
  total: string;
  currency: string;
  notes?: string | null;
  dueDate?: string | null;
  validUntil?: string | null;
  paymentStatus?: string | null;
  sdiStatus?: string | null;
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: 'Non pagata',
  PARTIAL: 'Parzialmente pagata',
  PAID: 'Pagata',
  OVERDUE: 'Scaduta',
};

const SDI_STATUS_LABELS: Record<string, string> = {
  NOT_SENT: 'Non inviata',
  PENDING: 'In attesa',
  ACCEPTED: 'Accettata',
  REJECTED: 'Rifiutata',
};

function fmtMoney(value: string | number, currency: string): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(Number(value));
}

function partyLines(party: FiscalParty | DocumentPdfInput['customer'], isSupplier: boolean): string[] {
  const lines: string[] = [];
  const name = isSupplier
    ? (party as FiscalParty).legalName
    : (party as DocumentPdfInput['customer']).companyName ||
      (party as DocumentPdfInput['customer']).name ||
      '—';
  lines.push(name);
  const vat = isSupplier
    ? (party as FiscalParty).vatNumber
    : (party as DocumentPdfInput['customer']).vatNumber;
  if (vat) lines.push(`P.IVA: ${vat}`);
  const taxCode = isSupplier
    ? (party as FiscalParty).taxCode
    : (party as DocumentPdfInput['customer']).taxCode;
  if (taxCode) lines.push(`CF: ${taxCode}`);
  if (isSupplier) {
    const s = party as FiscalParty;
    const addr = [s.address, s.zipCode, s.city, s.province].filter(Boolean).join(' ');
    if (addr.trim()) lines.push(addr);
    if (s.sdiCode) lines.push(`SDI: ${s.sdiCode}`);
    if (s.pecEmail) lines.push(`PEC: ${s.pecEmail}`);
  } else {
    const c = party as DocumentPdfInput['customer'];
    if (c.address) lines.push(c.address);
    if (c.email) lines.push(c.email);
    if (c.sdiCode) lines.push(`SDI: ${c.sdiCode}`);
    if (c.pecEmail) lines.push(`PEC: ${c.pecEmail}`);
  }
  return lines;
}

function drawPartyBlock(
  doc: PDFKit.PDFDocument,
  title: string,
  x: number,
  y: number,
  lines: string[],
  lineHeight = 12,
): number {
  doc.font('Helvetica-Bold').fontSize(10).text(title, x, y);
  let currentY = y + lineHeight;
  doc.font('Helvetica');
  for (const line of lines) {
    doc.text(line, x, currentY, { width: 230 });
    currentY += lineHeight;
  }
  return currentY;
}

export function generateDocumentPdf(input: DocumentPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const label = KIND_LABELS[input.kind];

    doc.fontSize(18).font('Helvetica-Bold').text(label, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(`N. ${input.documentNumber}`, { align: 'center' });
    doc.text(`Data: ${input.documentDate}`, { align: 'center' });
    if (input.dueDate) doc.text(`Scadenza: ${input.dueDate}`, { align: 'center' });
    if (input.validUntil) doc.text(`Valido fino al: ${input.validUntil}`, { align: 'center' });
    doc.moveDown(1);

    const colTop = doc.y;
    const supplierBottom = drawPartyBlock(
      doc,
      'Fornitore',
      50,
      colTop,
      partyLines(input.supplier, true),
    );
    const customerBottom = drawPartyBlock(
      doc,
      'Cliente',
      300,
      colTop,
      partyLines(input.customer, false),
    );

    const tableTop = Math.max(supplierBottom, customerBottom) + 24;
    doc.y = tableTop;
    const colDesc = 50;
    const colQty = 280;
    const colPrice = 330;
    const colTax = 400;
    const colTotal = 460;

    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Descrizione', colDesc, tableTop);
    doc.text('Q.tà', colQty, tableTop);
    doc.text('Prezzo', colPrice, tableTop);
    doc.text('IVA%', colTax, tableTop);
    doc.text('Totale', colTotal, tableTop);
    doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).stroke();

    let rowY = tableTop + 20;
    doc.font('Helvetica').fontSize(9);
    for (const line of input.lines) {
      if (rowY > 700) {
        doc.addPage();
        rowY = 50;
      }
      doc.text(line.description.slice(0, 60), colDesc, rowY, { width: 220 });
      doc.text(String(line.quantity), colQty, rowY);
      doc.text(fmtMoney(line.unit_price, input.currency), colPrice, rowY);
      doc.text(`${line.tax_rate}%`, colTax, rowY);
      doc.text(fmtMoney(line.line_total, input.currency), colTotal, rowY);
      rowY += 16;
    }

    rowY += 10;
    doc.moveTo(350, rowY).lineTo(545, rowY).stroke();
    rowY += 8;
    doc.font('Helvetica').text('Imponibile:', 350, rowY);
    doc.text(fmtMoney(input.subtotal, input.currency), colTotal, rowY);
    rowY += 14;
    doc.text('IVA:', 350, rowY);
    doc.text(fmtMoney(input.taxTotal, input.currency), colTotal, rowY);
    rowY += 14;
    doc.font('Helvetica-Bold').text('Totale:', 350, rowY);
    doc.text(fmtMoney(input.total, input.currency), colTotal, rowY);

    if (input.paymentStatus) {
      rowY += 18;
      const paymentLabel = PAYMENT_STATUS_LABELS[input.paymentStatus] ?? input.paymentStatus;
      doc.font('Helvetica').text(`Stato pagamento: ${paymentLabel}`, 50, rowY);
    }
    if (input.sdiStatus && input.kind === 'INVOICE') {
      rowY += 14;
      const sdiLabel = SDI_STATUS_LABELS[input.sdiStatus] ?? input.sdiStatus;
      doc.text(`Stato SDI: ${sdiLabel}`, 50, rowY);
    }
    if (input.notes?.trim()) {
      rowY += 20;
      doc.font('Helvetica-Bold').text('Note', 50, rowY);
      doc.font('Helvetica').text(input.notes, 50, rowY + 14, { width: 495 });
    }

    if (input.kind === 'INVOICE' && input.sdiStatus && input.sdiStatus !== 'NOT_SENT') {
      doc.fontSize(8).fillColor('#666').text(
        'Copia di cortesia — documento fiscale elettronico trasmesso via SDI.',
        50,
        750,
        { align: 'center', width: 495 },
      );
    }

    doc.end();
  });
}
