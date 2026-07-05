export interface ParsedPassiveInvoice {
  supplierName: string;
  supplierVatNumber: string | null;
  supplierTaxCode: string | null;
  documentNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  currency: string;
}

function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = xml.match(re);
  return match?.[1]?.trim() || null;
}

function extractAllTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'gi');
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    if (match[1]?.trim()) results.push(match[1].trim());
  }
  return results;
}

export function parsePassiveInvoiceXml(xmlContent: string): ParsedPassiveInvoice {
  const compact = xmlContent.replace(/\s+/g, ' ').trim();
  if (!compact.includes('FatturaElettronica') && !compact.includes('p:FatturaElettronica')) {
    throw new Error('INVALID_XML');
  }

  const supplierName =
    extractTag(compact, 'Denominazione') ||
    [extractTag(compact, 'Nome'), extractTag(compact, 'Cognome')].filter(Boolean).join(' ') ||
    'Fornitore';

  const vatIds = extractAllTags(compact, 'IdCodice');
  const supplierVatNumber = vatIds.find((v) => /^\d{11}$/.test(v)) || vatIds[0] || null;
  const supplierTaxCode = extractTag(compact, 'CodiceFiscale');

  const documentNumber = extractTag(compact, 'Numero') || `IMP-${Date.now()}`;
  const invoiceDateRaw = extractTag(compact, 'Data') || new Date().toISOString().slice(0, 10);
  const invoiceDate = invoiceDateRaw.slice(0, 10);

  const importoPagamento = extractTag(compact, 'ImportoPagamento');
  const imponibile = extractAllTags(compact, 'ImponibileImporto').map(Number);
  const imposta = extractAllTags(compact, 'Imposta').map(Number);

  const subtotal = imponibile.length ? imponibile.reduce((a, b) => a + b, 0) : 0;
  const taxTotal = imposta.length ? imposta.reduce((a, b) => a + b, 0) : 0;
  const total = importoPagamento
    ? Number(importoPagamento)
    : subtotal + taxTotal || Number(extractTag(compact, 'ImportoTotaleDocumento') ?? 0);

  const currency = extractTag(compact, 'Divisa') || 'EUR';

  return {
    supplierName,
    supplierVatNumber: supplierVatNumber ? `IT${supplierVatNumber.replace(/^IT/i, '')}` : null,
    supplierTaxCode,
    documentNumber,
    invoiceDate,
    dueDate: null,
    subtotal: subtotal || total,
    taxTotal,
    total: total || subtotal + taxTotal,
    currency,
  };
}
