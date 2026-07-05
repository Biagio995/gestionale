import { pool } from '../../db/pool.js';
import type { Item } from '../../types/index.js';

export async function findItemsByTenant(
  tenantId: string,
  pagination: { limit: number; offset: number },
): Promise<{ items: Item[]; total: number }> {
  const result = await pool.query<Item>(
    `SELECT * FROM items
     WHERE tenant_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, pagination.limit, pagination.offset],
  );
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM items
     WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId],
  );
  return {
    items: result.rows,
    total: parseInt(countResult.rows[0]?.count ?? '0', 10),
  };
}

export async function findItemByIdAndTenant(
  itemId: string,
  tenantId: string,
): Promise<Item | null> {
  const result = await pool.query<Item>(
    `SELECT * FROM items
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [itemId, tenantId],
  );
  return result.rows[0] ?? null;
}

export async function countItemsByTenant(tenantId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM items
     WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId],
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

export interface CreateItemInput {
  tenantId: string;
  name: string;
  description?: string | null;
  stockQuantity?: number;
  trackStock?: boolean;
  unitPrice?: number | null;
}

export async function createItem(input: CreateItemInput): Promise<Item> {
  const result = await pool.query<Item>(
    `INSERT INTO items (tenant_id, name, description, stock_quantity, track_stock, unit_price)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.tenantId,
      input.name,
      input.description ?? null,
      input.stockQuantity ?? 0,
      input.trackStock ?? false,
      input.unitPrice ?? null,
    ],
  );
  return result.rows[0]!;
}

export interface UpdateItemInput {
  itemId: string;
  tenantId: string;
  name: string;
  description?: string | null;
  stockQuantity?: number;
  trackStock?: boolean;
  unitPrice?: number | null;
}

export async function updateItem(input: UpdateItemInput): Promise<Item | null> {
  const result = await pool.query<Item>(
    `UPDATE items
     SET name = $1,
         description = $2,
         stock_quantity = COALESCE($3, stock_quantity),
         track_stock = COALESCE($4, track_stock),
         unit_price = COALESCE($5, unit_price),
         updated_at = NOW()
     WHERE id = $6 AND tenant_id = $7 AND deleted_at IS NULL
     RETURNING *`,
    [
      input.name,
      input.description ?? null,
      input.stockQuantity,
      input.trackStock,
      input.unitPrice,
      input.itemId,
      input.tenantId,
    ],
  );
  return result.rows[0] ?? null;
}

export async function softDeleteItem(
  itemId: string,
  tenantId: string,
): Promise<Item | null> {
  const result = await pool.query<Item>(
    `UPDATE items
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [itemId, tenantId],
  );
  return result.rows[0] ?? null;
}
