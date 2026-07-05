import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Company, CompanyContract, CompanyContractDetail, CompanyContractPayload, ContractListFilters, CreateCompanyPayload, CreateCompanyResult, PlatformStats, RenewContractPayload, SupportTicket, TicketDetail, TicketListFilters, TicketStatus, UpdateCompanyPayload } from '@/types';
import * as ticketsService from '@/services/ticketsService';
import { extractApiError } from '@/services/api';

export const useAdminStore = defineStore('admin', () => {
  const stats = ref<PlatformStats | null>(null);
  const companies = ref<Company[]>([]);
  const contracts = ref<CompanyContract[]>([]);
  const tickets = ref<SupportTicket[]>([]);
  const currentTicket = ref<TicketDetail | null>(null);
  const unreadCount = ref(0);
  const expiringContractsCount = ref(0);
  const currentContract = ref<CompanyContractDetail | null>(null);
  const ticketFilters = ref<TicketListFilters>({});
  const loading = ref(false);
  const errorKey = ref<string | null>(null);

  async function loadStats(): Promise<void> {
    stats.value = await ticketsService.fetchPlatformStats();
    unreadCount.value = stats.value?.unreadTickets ?? 0;
    expiringContractsCount.value = stats.value?.expiringContracts ?? 0;
  }

  async function loadCompanies(): Promise<void> {
    loading.value = true;
    errorKey.value = null;
    try {
      companies.value = await ticketsService.fetchCompanies();
    } catch (err) {
      errorKey.value = extractApiError(err).messageKey;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createCompany(payload: CreateCompanyPayload): Promise<CreateCompanyResult> {
    const result = await ticketsService.createCompany(payload);
    companies.value.unshift(result.company);
    await loadStats();
    return result;
  }

  async function updateCompany(companyId: string, payload: UpdateCompanyPayload): Promise<void> {
    const updated = await ticketsService.updateCompany(companyId, payload);
    const index = companies.value.findIndex((c) => c.id === companyId);
    if (index !== -1) companies.value[index] = updated;
  }

  async function toggleCompanyStatus(company: Company): Promise<void> {
    const newStatus = company.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const updated = await ticketsService.updateCompanyStatus(company.id, newStatus);
    const index = companies.value.findIndex((c) => c.id === company.id);
    if (index !== -1) companies.value[index] = updated;
  }

  async function loadTickets(
    filters?: TicketListFilters,
    options?: { silent?: boolean },
  ): Promise<void> {
    const silent = options?.silent ?? false;
    if (!silent) {
      loading.value = true;
      errorKey.value = null;
    }
    if (filters) {
      ticketFilters.value = filters;
    }
    try {
      tickets.value = await ticketsService.fetchAllTickets(ticketFilters.value);
      unreadCount.value = await ticketsService.fetchUnreadTicketCount();
    } catch (err) {
      if (!silent) {
        errorKey.value = extractApiError(err).messageKey;
      }
      throw err;
    } finally {
      if (!silent) loading.value = false;
    }
  }

  async function loadContracts(filters?: ContractListFilters): Promise<void> {
    loading.value = true;
    errorKey.value = null;
    try {
      contracts.value = await ticketsService.fetchContracts(filters);
    } catch (err) {
      errorKey.value = extractApiError(err).messageKey;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function addContract(payload: CompanyContractPayload): Promise<void> {
    const created = await ticketsService.createContract(payload);
    contracts.value.unshift(created);
  }

  async function editContract(
    contractId: string,
    payload: Partial<Omit<CompanyContractPayload, 'tenantId'>>,
  ): Promise<void> {
    const updated = await ticketsService.updateContract(contractId, payload);
    const index = contracts.value.findIndex((c) => c.id === contractId);
    if (index !== -1) contracts.value[index] = updated;
  }

  async function removeContract(contractId: string): Promise<void> {
    await ticketsService.deleteContract(contractId);
    contracts.value = contracts.value.filter((c) => c.id !== contractId);
    if (currentContract.value?.contract.id === contractId) {
      currentContract.value = null;
    }
    await loadStats();
  }

  async function loadContract(id: string): Promise<void> {
    currentContract.value = await ticketsService.fetchContract(id);
  }

  async function renewContract(
    contractId: string,
    payload: RenewContractPayload,
  ): Promise<void> {
    const renewed = await ticketsService.renewContract(contractId, payload);
    const index = contracts.value.findIndex((c) => c.id === contractId);
    if (index !== -1) contracts.value[index] = renewed;
    await loadContract(contractId);
    await loadStats();
  }

  async function refreshExpiringCount(): Promise<void> {
    const statsData = await ticketsService.fetchPlatformStats();
    expiringContractsCount.value = statsData.expiringContracts;
  }

  async function refreshUnreadCount(): Promise<void> {
    unreadCount.value = await ticketsService.fetchUnreadTicketCount();
  }

  async function loadTicket(id: string, options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    if (!silent) {
      loading.value = true;
      currentTicket.value = null;
    }
    try {
      currentTicket.value = await ticketsService.fetchAdminTicket(id);
      await refreshUnreadCount();
    } finally {
      if (!silent) loading.value = false;
    }
  }

  async function reply(ticketId: string, body: string): Promise<void> {
    const message = await ticketsService.sendAdminTicketMessage(ticketId, body);
    if (currentTicket.value?.ticket.id === ticketId) {
      currentTicket.value.messages.push(message);
    }
  }

  async function setTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
    const updated = await ticketsService.updateAdminTicketStatus(ticketId, status);
    const index = tickets.value.findIndex((t) => t.id === ticketId);
    if (index !== -1) tickets.value[index] = updated;
    if (currentTicket.value?.ticket.id === ticketId) {
      currentTicket.value.ticket = updated;
    }
  }

  async function assignToMe(ticketId: string, userId: string): Promise<void> {
    const updated = await ticketsService.assignAdminTicket(ticketId, userId);
    const index = tickets.value.findIndex((t) => t.id === ticketId);
    if (index !== -1) tickets.value[index] = updated;
    if (currentTicket.value?.ticket.id === ticketId) {
      currentTicket.value.ticket = updated;
    }
  }

  return {
    stats,
    companies,
    contracts,
    tickets,
    currentTicket,
    unreadCount,
    expiringContractsCount,
    currentContract,
    ticketFilters,
    loading,
    errorKey,
    loadStats,
    loadCompanies,
    createCompany,
    updateCompany,
    toggleCompanyStatus,
    loadTickets,
    loadContracts,
    addContract,
    editContract,
    removeContract,
    loadContract,
    renewContract,
    refreshExpiringCount,
    loadTicket,
    refreshUnreadCount,
    reply,
    setTicketStatus,
    assignToMe,
  };
});
