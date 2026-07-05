import { api } from './api';
import type { Company, CompanyContract, CompanyContractDetail, CompanyContractPayload, ContractListFilters, CreateCompanyPayload, CreateCompanyResult, RenewContractPayload, UpdateCompanyPayload, PlatformStats, SupportTicket, TenantStats, TicketDetail, TicketListFilters, TicketMessage, TicketPayload, TicketStatus } from '@/types';

export async function fetchTenantStats(): Promise<TenantStats> {
  const { data } = await api.get<TenantStats>('/tickets/stats');
  return data;
}

export async function fetchTickets(): Promise<SupportTicket[]> {
  const { data } = await api.get<SupportTicket[]>('/tickets');
  return data;
}

export async function fetchTicket(id: string): Promise<TicketDetail> {
  const { data } = await api.get<TicketDetail>(`/tickets/${id}`);
  return data;
}

export async function createTicket(payload: TicketPayload): Promise<SupportTicket> {
  const { data } = await api.post<SupportTicket>('/tickets', payload);
  return data;
}

export async function sendTicketMessage(ticketId: string, body: string): Promise<TicketMessage> {
  const { data } = await api.post<TicketMessage>(`/tickets/${ticketId}/messages`, { body });
  return data;
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<SupportTicket> {
  const { data } = await api.patch<SupportTicket>(`/tickets/${ticketId}/status`, { status });
  return data;
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const { data } = await api.get<PlatformStats>('/admin/stats');
  return data;
}

export async function fetchCompanies(): Promise<Company[]> {
  const { data } = await api.get<Company[]>('/admin/companies');
  return data;
}

export async function createCompany(payload: CreateCompanyPayload): Promise<CreateCompanyResult> {
  const { data } = await api.post<CreateCompanyResult>('/admin/companies', payload);
  return data;
}

export async function updateCompany(
  companyId: string,
  payload: UpdateCompanyPayload,
): Promise<Company> {
  const { data } = await api.patch<Company>(`/admin/companies/${companyId}`, payload);
  return data;
}

export async function updateCompanyStatus(
  companyId: string,
  status: 'ACTIVE' | 'SUSPENDED',
): Promise<Company> {
  const { data } = await api.patch<Company>(`/admin/companies/${companyId}/status`, { status });
  return data;
}

export async function fetchAllTickets(filters?: TicketListFilters): Promise<SupportTicket[]> {
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.unreadOnly) params.unreadOnly = 'true';
  const { data } = await api.get<SupportTicket[]>('/admin/tickets', { params });
  return data;
}

export async function fetchUnreadTicketCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>('/admin/tickets/unread-count');
  return data.count;
}

export async function fetchAdminTicket(id: string): Promise<TicketDetail> {
  const { data } = await api.get<TicketDetail>(`/admin/tickets/${id}`);
  return data;
}

export async function sendAdminTicketMessage(
  ticketId: string,
  body: string,
): Promise<TicketMessage> {
  const { data } = await api.post<TicketMessage>(`/admin/tickets/${ticketId}/messages`, { body });
  return data;
}

export async function updateAdminTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<SupportTicket> {
  const { data } = await api.patch<SupportTicket>(`/admin/tickets/${ticketId}/status`, { status });
  return data;
}

export async function assignAdminTicket(
  ticketId: string,
  assignedTo: string | null,
): Promise<SupportTicket> {
  const { data } = await api.patch<SupportTicket>(`/admin/tickets/${ticketId}/assign`, {
    assignedTo,
  });
  return data;
}

export async function fetchContracts(filters?: ContractListFilters): Promise<CompanyContract[]> {
  const { data } = await api.get<CompanyContract[]>('/admin/contracts', { params: filters });
  return data;
}

export async function fetchContract(id: string): Promise<CompanyContractDetail> {
  const { data } = await api.get<CompanyContractDetail>(`/admin/contracts/${id}`);
  return data;
}

export async function createContract(payload: CompanyContractPayload): Promise<CompanyContract> {
  const { data } = await api.post<CompanyContract>('/admin/contracts', payload);
  return data;
}

export async function updateContract(
  contractId: string,
  payload: Partial<Omit<CompanyContractPayload, 'tenantId'>>,
): Promise<CompanyContract> {
  const { data } = await api.patch<CompanyContract>(`/admin/contracts/${contractId}`, payload);
  return data;
}

export async function deleteContract(contractId: string): Promise<void> {
  await api.delete(`/admin/contracts/${contractId}`);
}

export async function renewContract(
  contractId: string,
  payload: RenewContractPayload,
): Promise<CompanyContract> {
  const { data } = await api.post<CompanyContract>(`/admin/contracts/${contractId}/renew`, payload);
  return data;
}
