import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Item, ItemPayload } from '@/types';
import * as itemsService from '@/services/itemsService';
import { extractApiError } from '@/services/api';

export const useItemsStore = defineStore('items', () => {
  const items = ref<Item[]>([]);
  const loading = ref(false);
  const errorKey = ref<string | null>(null);

  async function loadItems(): Promise<void> {
    loading.value = true;
    errorKey.value = null;
    try {
      items.value = await itemsService.fetchItems();
    } catch (err) {
      errorKey.value = extractApiError(err).messageKey;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function addItem(payload: ItemPayload): Promise<void> {
    const created = await itemsService.createItem(payload);
    items.value.unshift(created);
  }

  async function editItem(id: string, payload: ItemPayload): Promise<void> {
    const updated = await itemsService.updateItem(id, payload);
    const index = items.value.findIndex((i) => i.id === id);
    if (index !== -1) {
      items.value[index] = updated;
    }
  }

  async function removeItem(id: string): Promise<void> {
    await itemsService.deleteItem(id);
    items.value = items.value.filter((i) => i.id !== id);
  }

  return {
    items,
    loading,
    errorKey,
    loadItems,
    addItem,
    editItem,
    removeItem,
  };
});
