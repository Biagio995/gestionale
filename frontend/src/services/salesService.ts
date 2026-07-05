import { api } from './api';
import { downloadBlob } from '@/utils/download';
import type {
  ContactDocumentSummary,
  ConvertDocumentOptions,
  DocumentChain,
  LineFulfillment,
  QuotePayload,
  SalesDeliveryNote,
  SalesDocumentLine,
  SalesInvoice,
  SalesListFilters,
  SalesOrder,
  SalesPipelineData,
  SalesQuote,
  SalesStats,
} from '@/types';

export type SalesDocKind = 'quotes' | 'orders' | 'delivery-notes' | 'invoices';

export async function fetchSalesStats(): Promise<SalesStats> {
  const { data } = await api.get<SalesStats>('/sales/stats');
  return data;
}

export async function fetchQuotes(filters?: SalesListFilters): Promise<SalesQuote[]> {
  const { data } = await api.get<SalesQuote[]>('/sales/quotes', { params: filters });
  return data;
}

export async function fetchQuote(
  id: string,
): Promise<{ quote: SalesQuote; lines: SalesDocumentLine[]; chain: DocumentChain }> {
  const { data } = await api.get<{ quote: SalesQuote; lines: SalesDocumentLine[]; chain: DocumentChain }>(
    `/sales/quotes/${id}`,
  );
  return data;
}

export async function createQuote(payload: QuotePayload): Promise<SalesQuote> {
  const { data } = await api.post<SalesQuote>('/sales/quotes', payload);
  return data;
}

export async function updateQuote(id: string, payload: QuotePayload): Promise<SalesQuote> {
  const { data } = await api.put<SalesQuote>(`/sales/quotes/${id}`, payload);
  return data;
}

export async function updateQuoteStatus(id: string, status: string): Promise<SalesQuote> {
  const { data } = await api.patch<SalesQuote>(`/sales/quotes/${id}/status`, { status });
  return data;
}

export async function convertQuoteToOrder(id: string): Promise<SalesOrder> {
  const { data } = await api.post<SalesOrder>(`/sales/quotes/${id}/convert-to-order`);
  return data;
}

export async function convertQuoteToInvoice(
  id: string,
  options?: ConvertDocumentOptions,
): Promise<SalesInvoice> {
  const { data } = await api.post<SalesInvoice>(`/sales/quotes/${id}/convert-to-invoice`, options ?? {});
  return data;
}

export async function deleteQuote(id: string): Promise<void> {
  await api.delete(`/sales/quotes/${id}`);
}

export async function fetchOrders(filters?: SalesListFilters): Promise<SalesOrder[]> {
  const { data } = await api.get<SalesOrder[]>('/sales/orders', { params: filters });
  return data;
}

export async function fetchOrder(
  id: string,
): Promise<{ order: SalesOrder; lines: SalesDocumentLine[]; chain: DocumentChain; fulfillment: LineFulfillment[] }> {
  const { data } = await api.get<{
    order: SalesOrder;
    lines: SalesDocumentLine[];
    chain: DocumentChain;
    fulfillment: LineFulfillment[];
  }>(`/sales/orders/${id}`);
  return data;
}

export async function updateOrderStatus(id: string, status: string): Promise<SalesOrder> {
  const { data } = await api.patch<SalesOrder>(`/sales/orders/${id}/status`, { status });
  return data;
}

export async function convertOrderToDeliveryNote(
  id: string,
  options?: ConvertDocumentOptions,
): Promise<SalesDeliveryNote> {
  const { data } = await api.post<SalesDeliveryNote>(
    `/sales/orders/${id}/convert-to-delivery-note`,
    options ?? {},
  );
  return data;
}

export async function convertOrderToInvoice(
  id: string,
  options?: ConvertDocumentOptions,
): Promise<SalesInvoice> {
  const { data } = await api.post<SalesInvoice>(`/sales/orders/${id}/convert-to-invoice`, options ?? {});
  return data;
}

export async function fetchDeliveryNotes(filters?: SalesListFilters): Promise<SalesDeliveryNote[]> {
  const { data } = await api.get<SalesDeliveryNote[]>('/sales/delivery-notes', { params: filters });
  return data;
}

export async function fetchDeliveryNote(
  id: string,
): Promise<{
  deliveryNote: SalesDeliveryNote;
  lines: SalesDocumentLine[];
  chain: DocumentChain;
  fulfillment: LineFulfillment[];
}> {
  const { data } = await api.get<{
    deliveryNote: SalesDeliveryNote;
    lines: SalesDocumentLine[];
    chain: DocumentChain;
    fulfillment: LineFulfillment[];
  }>(`/sales/delivery-notes/${id}`);
  return data;
}

export async function updateDeliveryNoteStatus(id: string, status: string): Promise<SalesDeliveryNote> {
  const { data } = await api.patch<SalesDeliveryNote>(`/sales/delivery-notes/${id}/status`, { status });
  return data;
}

export async function convertDeliveryNoteToInvoice(
  id: string,
  options?: ConvertDocumentOptions,
): Promise<SalesInvoice> {
  const { data } = await api.post<SalesInvoice>(
    `/sales/delivery-notes/${id}/convert-to-invoice`,
    options ?? {},
  );
  return data;
}

export async function fetchInvoices(filters?: SalesListFilters): Promise<SalesInvoice[]> {
  const { data } = await api.get<SalesInvoice[]>('/sales/invoices', { params: filters });
  return data;
}

export async function fetchInvoice(
  id: string,
): Promise<{ invoice: SalesInvoice; lines: SalesDocumentLine[]; chain: DocumentChain }> {
  const { data } = await api.get<{ invoice: SalesInvoice; lines: SalesDocumentLine[]; chain: DocumentChain }>(
    `/sales/invoices/${id}`,
  );
  return data;
}

export async function updateInvoice(id: string, payload: QuotePayload): Promise<SalesInvoice> {
  const { data } = await api.put<SalesInvoice>(`/sales/invoices/${id}`, payload);
  return data;
}

export async function issueInvoice(id: string): Promise<SalesInvoice> {
  const { data } = await api.post<SalesInvoice>(`/sales/invoices/${id}/issue`);
  return data;
}

export async function fetchPipeline(): Promise<SalesPipelineData> {
  const { data } = await api.get<SalesPipelineData>('/sales/pipeline');
  return data;
}

export async function updateInvoiceStatus(id: string, status: string): Promise<SalesInvoice> {
  const { data } = await api.patch<SalesInvoice>(`/sales/invoices/${id}/status`, { status });
  return data;
}

export async function fetchContactDocuments(contactId: string): Promise<ContactDocumentSummary[]> {
  const { data } = await api.get<ContactDocumentSummary[]>(`/sales/contacts/${contactId}/documents`);
  return data;
}

export async function downloadDocumentPdf(kind: SalesDocKind, id: string, filename: string): Promise<void> {
  const { data } = await api.get<Blob>(`/sales/${kind}/${id}/pdf`, { responseType: 'blob' });
  downloadBlob(data, filename);
}

export async function emailDocument(
  kind: SalesDocKind,
  id: string,
  payload?: { to?: string; subject?: string; message?: string },
): Promise<{ sentTo: string }> {
  const { data } = await api.post<{ sentTo: string }>(`/sales/${kind}/${id}/send-email`, payload ?? {});
  return data;
}
