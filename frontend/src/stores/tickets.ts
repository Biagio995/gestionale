import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { SupportTicket, TicketDetail, TicketPayload, TicketStatus } from '@/types';
import * as ticketsService from '@/services/ticketsService';
import { extractApiError } from '@/services/api';

export const useTicketsStore = defineStore('tickets', () => {
  const tickets = ref<SupportTicket[]>([]);
  const current = ref<TicketDetail | null>(null);
  const loading = ref(false);
  const errorKey = ref<string | null>(null);

  async function loadTickets(options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    if (!silent) {
      loading.value = true;
      errorKey.value = null;
    }
    try {
      tickets.value = await ticketsService.fetchTickets();
    } catch (err) {
      if (!silent) {
        errorKey.value = extractApiError(err).messageKey;
      }
      throw err;
    } finally {
      if (!silent) loading.value = false;
    }
  }

  async function loadTicket(id: string, options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    if (!silent) {
      loading.value = true;
      errorKey.value = null;
      current.value = null;
    }
    try {
      current.value = await ticketsService.fetchTicket(id);
    } catch (err) {
      if (!silent) {
        errorKey.value = extractApiError(err).messageKey;
      }
      throw err;
    } finally {
      if (!silent) loading.value = false;
    }
  }

  async function create(payload: TicketPayload): Promise<SupportTicket> {
    const created = await ticketsService.createTicket(payload);
    tickets.value.unshift(created);
    return created;
  }

  async function reply(ticketId: string, body: string): Promise<void> {
    const message = await ticketsService.sendTicketMessage(ticketId, body);
    if (current.value?.ticket.id === ticketId) {
      current.value.messages.push(message);
    }
  }

  async function setStatus(ticketId: string, status: TicketStatus): Promise<void> {
    const updated = await ticketsService.updateTicketStatus(ticketId, status);
    const index = tickets.value.findIndex((t) => t.id === ticketId);
    if (index !== -1) tickets.value[index] = updated;
    if (current.value?.ticket.id === ticketId) {
      current.value.ticket = updated;
    }
  }

  return {
    tickets,
    current,
    loading,
    errorKey,
    loadTickets,
    loadTicket,
    create,
    reply,
    setStatus,
  };
});
