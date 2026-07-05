import { api } from './api';
import type {
  CrmActivity,
  CrmContact,
  CrmContactDetail,
  CrmDeal,
  CrmStats,
  ContactPayload,
  DealPayload,
  ActivityPayload,
  ContactStatus,
  DealStage,
} from '@/types';

export async function fetchCrmStats(): Promise<CrmStats> {
  const { data } = await api.get<CrmStats>('/crm/stats');
  return data;
}

export async function fetchContacts(status?: ContactStatus): Promise<CrmContact[]> {
  const { data } = await api.get<CrmContact[]>('/crm/contacts', {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function fetchContact(id: string): Promise<CrmContactDetail> {
  const { data } = await api.get<CrmContactDetail>(`/crm/contacts/${id}`);
  return data;
}

export async function createContact(payload: ContactPayload): Promise<CrmContact> {
  const { data } = await api.post<CrmContact>('/crm/contacts', payload);
  return data;
}

export async function updateContact(id: string, payload: Partial<ContactPayload>): Promise<CrmContact> {
  const { data } = await api.put<CrmContact>(`/crm/contacts/${id}`, payload);
  return data;
}

export async function deleteContact(id: string): Promise<void> {
  await api.delete(`/crm/contacts/${id}`);
}

export async function fetchDeals(filters?: {
  stage?: DealStage;
  contactId?: string;
}): Promise<CrmDeal[]> {
  const { data } = await api.get<CrmDeal[]>('/crm/deals', { params: filters });
  return data;
}

export async function createDeal(payload: DealPayload): Promise<CrmDeal> {
  const { data } = await api.post<CrmDeal>('/crm/deals', payload);
  return data;
}

export async function updateDeal(id: string, payload: Partial<DealPayload>): Promise<CrmDeal> {
  const { data } = await api.put<CrmDeal>(`/crm/deals/${id}`, payload);
  return data;
}

export async function deleteDeal(id: string): Promise<void> {
  await api.delete(`/crm/deals/${id}`);
}

export async function createActivity(payload: ActivityPayload): Promise<CrmActivity> {
  const { data } = await api.post<CrmActivity>('/crm/activities', payload);
  return data;
}
