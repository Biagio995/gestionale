import { api } from './api';
import type {
  FiscalDashboardStats,
  FiscalProfile,
  FiscalProfilePayload,
  PassiveInvoice,
  PassiveInvoicePayload,
  ScadenzarioEntry,
  VatValidationResult,
} from '@/types';
import type { SalesInvoice } from '@/types';

export async function fetchFiscalProfile(): Promise<FiscalProfile | null> {
  const { data } = await api.get<FiscalProfile | null>('/sales/fiscal/profile');
  return data;
}

export async function saveFiscalProfile(payload: FiscalProfilePayload): Promise<FiscalProfile> {
  const { data } = await api.put<FiscalProfile>('/sales/fiscal/profile', payload);
  return data;
}

export async function validateVat(vatNumber: string): Promise<VatValidationResult> {
  const { data } = await api.post<VatValidationResult>('/sales/fiscal/validate-vat', { vatNumber });
  return data;
}

export async function fetchFiscalDashboard(): Promise<FiscalDashboardStats> {
  const { data } = await api.get<FiscalDashboardStats>('/sales/fiscal/dashboard');
  return data;
}

export async function sendInvoiceToSdi(invoiceId: string): Promise<{
  invoice: SalesInvoice;
  xmlHash: string;
  messageId: string;
}> {
  const { data } = await api.post<{ invoice: SalesInvoice; xmlHash: string; messageId: string }>(
    `/sales/invoices/${invoiceId}/send-sdi`,
  );
  return data;
}

export async function fetchInvoiceXml(invoiceId: string): Promise<string> {
  const { data } = await api.get<{ xml: string }>(`/sales/invoices/${invoiceId}/xml`);
  return data.xml;
}

export async function recordInvoicePayment(
  invoiceId: string,
  paidAmount: number,
  paidAt?: string | null,
): Promise<SalesInvoice> {
  const { data } = await api.patch<SalesInvoice>(`/sales/invoices/${invoiceId}/payment`, {
    paidAmount,
    paidAt,
  });
  return data;
}

export async function fetchPassiveInvoices(): Promise<PassiveInvoice[]> {
  const { data } = await api.get<PassiveInvoice[]>('/sales/passive-invoices');
  return data;
}

export async function createPassiveInvoice(payload: PassiveInvoicePayload): Promise<PassiveInvoice> {
  const { data } = await api.post<PassiveInvoice>('/sales/passive-invoices', payload);
  return data;
}

export async function recordPassivePayment(
  passiveInvoiceId: string,
  paidAmount: number,
  paidAt?: string | null,
): Promise<PassiveInvoice> {
  const { data } = await api.patch<PassiveInvoice>(
    `/sales/passive-invoices/${passiveInvoiceId}/payment`,
    { paidAmount, paidAt },
  );
  return data;
}

export async function fetchScadenzario(): Promise<ScadenzarioEntry[]> {
  const { data } = await api.get<ScadenzarioEntry[]>('/sales/scadenzario');
  return data;
}

export async function importPassiveInvoiceXml(xmlContent: string): Promise<PassiveInvoice> {
  const { data } = await api.post<PassiveInvoice>('/sales/passive-invoices/import-xml', { xmlContent });
  return data;
}
