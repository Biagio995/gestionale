import { createHash } from 'crypto';
import type { SalesDocumentLine } from '../sales/sales.repository.js';

export interface FiscalParty {
  legalName: string;
  vatNumber: string;
  taxCode?: string | null;
  address?: string | null;
  city?: string | null;
  zipCode?: string | null;
  province?: string | null;
  country?: string | null;
  sdiCode?: string | null;
  pecEmail?: string | null;
}

export interface FatturaPaInput {
  transmissionId: string;
  progressiveNumber: string;
  supplier: FiscalParty;
  customer: FiscalParty;
  documentNumber: string;
  invoiceDate: string;
  currency: string;
  lines: SalesDocumentLine[];
  subtotal: string;
  taxTotal: string;
  total: string;
}

function escapeXml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function partyBlock(tag: 'CedentePrestatore' | 'CessionarioCommittente', party: FiscalParty): string {
  const vatDigits = party.vatNumber.replace(/^IT/i, '');
  const taxCode = party.taxCode?.trim() || vatDigits;
  const address = party.address?.trim() || 'N/D';
  const city = party.city?.trim() || 'N/D';
  const zip = party.zipCode?.trim() || '00000';
  const province = party.province?.trim() || 'ND';
  const country = party.country?.trim() || 'IT';

  return `
    <${tag}>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>${escapeXml(country)}</IdPaese>
          <IdCodice>${escapeXml(vatDigits)}</IdCodice>
        </IdFiscaleIVA>
        <CodiceFiscale>${escapeXml(taxCode)}</CodiceFiscale>
        <Anagrafica>
          <Denominazione>${escapeXml(party.legalName)}</Denominazione>
        </Anagrafica>
        <RegimeFiscale>RF01</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${escapeXml(address)}</Indirizzo>
        <CAP>${escapeXml(zip)}</CAP>
        <Comune>${escapeXml(city)}</Comune>
        <Provincia>${escapeXml(province)}</Provincia>
        <Nazione>${escapeXml(country)}</Nazione>
      </Sede>
    </${tag}>`;
}

function linesBlock(lines: SalesDocumentLine[]): string {
  const dettaglio = lines
    .map((line, index) => {
      const aliquota = Number(line.tax_rate).toFixed(2);
      return `
      <DettaglioLinee>
        <NumeroLinea>${index + 1}</NumeroLinea>
        <Descrizione>${escapeXml(line.description)}</Descrizione>
        <Quantita>${Number(line.quantity).toFixed(3)}</Quantita>
        <PrezzoUnitario>${Number(line.unit_price).toFixed(2)}</PrezzoUnitario>
        <PrezzoTotale>${Number(line.line_subtotal).toFixed(2)}</PrezzoTotale>
        <AliquotaIVA>${aliquota}</AliquotaIVA>
      </DettaglioLinee>`;
    })
    .join('');

  const taxRate = lines[0] ? Number(lines[0].tax_rate).toFixed(2) : '22.00';
  const imponibile = lines.reduce((acc, l) => acc + Number(l.line_subtotal), 0).toFixed(2);
  const imposta = lines.reduce((acc, l) => acc + Number(l.line_tax), 0).toFixed(2);

  return `
    <DatiBeniServizi>
      ${dettaglio}
      <DatiRiepilogo>
        <AliquotaIVA>${taxRate}</AliquotaIVA>
        <ImponibileImporto>${imponibile}</ImponibileImporto>
        <Imposta>${imposta}</Imposta>
        <EsigibilitaIVA>I</EsigibilitaIVA>
      </DatiRiepilogo>
    </DatiBeniServizi>`;
}

export function generateFatturaPaXml(input: FatturaPaInput): string {
  const supplierVat = input.supplier.vatNumber.replace(/^IT/i, '');
  const recipientCode = input.customer.sdiCode?.trim().toUpperCase() || '0000000';
  const pec = input.customer.pecEmail?.trim();

  const pecBlock = !input.customer.sdiCode && pec
    ? `<PECDestinatario>${escapeXml(pec)}</PECDestinatario>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>${escapeXml(supplierVat)}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${escapeXml(input.progressiveNumber)}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${escapeXml(recipientCode)}</CodiceDestinatario>
      ${pecBlock}
    </DatiTrasmissione>
    ${partyBlock('CedentePrestatore', input.supplier)}
    ${partyBlock('CessionarioCommittente', input.customer)}
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>${escapeXml(input.currency)}</Divisa>
        <Data>${escapeXml(input.invoiceDate)}</Data>
        <Numero>${escapeXml(input.documentNumber)}</Numero>
        <ImportoTotaleDocumento>${Number(input.total).toFixed(2)}</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    ${linesBlock(input.lines)}
    <DatiPagamento>
      <CondizioniPagamento>TP02</CondizioniPagamento>
      <DettaglioPagamento>
        <ModalitaPagamento>MP05</ModalitaPagamento>
        <ImportoPagamento>${Number(input.total).toFixed(2)}</ImportoPagamento>
      </DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;
}

export function hashXml(xml: string): string {
  return createHash('sha256').update(xml, 'utf8').digest('hex');
}
