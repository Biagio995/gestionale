import { z } from 'zod';
import type { Item, PaginatedResult, RequestContext } from '../../types/index.js';
import { logEvent } from '../audit/audit.service.js';
import { notFound } from '../../utils/errors.js';
import * as itemsRepo from './items.repository.js';

const itemBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  stockQuantity: z.number().min(0).optional(),
  trackStock: z.boolean().optional(),
  unitPrice: z.number().min(0).optional().nullable(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function getItem(
  context: RequestContext,
  itemId: string,
): Promise<Item> {
  const item = await itemsRepo.findItemByIdAndTenant(itemId, context.tenantId);
  if (!item) {
    throw notFound('errors.itemNotFound');
  }
  return item;
}

export async function listItems(
  context: RequestContext,
  query: unknown,
): Promise<PaginatedResult<Item>> {
  const { page, limit } = listQuerySchema.parse(query ?? {});
  const offset = (page - 1) * limit;
  const result = await itemsRepo.findItemsByTenant(context.tenantId, { limit, offset });
  return {
    items: result.items,
    page,
    limit,
    total: result.total,
  };
}

export async function createItem(
  context: RequestContext,
  body: unknown,
): Promise<Item> {
  const input = itemBodySchema.parse(body);
  const item = await itemsRepo.createItem({
    tenantId: context.tenantId,
    name: input.name,
    description: input.description,
    stockQuantity: input.stockQuantity,
    trackStock: input.trackStock,
    unitPrice: input.unitPrice,
  });
  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'item_created',
    entityType: 'item',
    entityId: item.id,
    context: { name: item.name },
  });
  return item;
}

export async function updateItem(
  context: RequestContext,
  itemId: string,
  body: unknown,
): Promise<Item> {
  const input = itemBodySchema.parse(body);
  const item = await itemsRepo.updateItem({
    itemId,
    tenantId: context.tenantId,
    name: input.name,
    description: input.description,
    stockQuantity: input.stockQuantity,
    trackStock: input.trackStock,
    unitPrice: input.unitPrice,
  });
  if (!item) {
    throw notFound('errors.itemNotFound');
  }
  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'item_updated',
    entityType: 'item',
    entityId: item.id,
    context: { name: item.name },
  });
  return item;
}

export async function deleteItem(
  context: RequestContext,
  itemId: string,
): Promise<void> {
  const item = await itemsRepo.softDeleteItem(itemId, context.tenantId);
  if (!item) {
    throw notFound('errors.itemNotFound');
  }
  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'item_deleted',
    entityType: 'item',
    entityId: item.id,
    context: { name: item.name },
  });
}
