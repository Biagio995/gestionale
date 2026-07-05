import { api } from './api';
import type { Item, ItemPayload } from '@/types';

export async function fetchItems(): Promise<Item[]> {
  const { data } = await api.get<{ items: Item[] }>('/items');
  return data.items;
}

export async function createItem(payload: ItemPayload): Promise<Item> {
  const { data } = await api.post<Item>('/items', payload);
  return data;
}

export async function updateItem(id: string, payload: ItemPayload): Promise<Item> {
  const { data } = await api.put<Item>(`/items/${id}`, payload);
  return data;
}

export async function deleteItem(id: string): Promise<void> {
  await api.delete(`/items/${id}`);
}
