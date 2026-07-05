import type { PoolClient } from 'pg';
import { pool } from '../../db/pool.js';
import type {
  SalesDeliveryNote,
  SalesDocumentLine,
  SalesDocumentType,
  SalesInvoice,
  SalesOrder,
  SalesQuote,
} from './sales.repository.js';
import {
  computeLineTotals,
  sumLineTotals,
  type LineInput,
} from './sales.repository.js';

export interface ChainDocumentRef {
  id: string;
  document_number: string;
  status: string;
}

export interface DocumentChain {
  quote: ChainDocumentRef | null;
  order: ChainDocumentRef | null;
  deliveryNotes: ChainDocumentRef[];
  invoices: ChainDocumentRef[];
}

export interface LineQuantitySelection {
  lineId: string;
  quantity: number;
}

async function copyLinesWithSource(
  client: PoolClient,
  tenantId: string,
  fromType: SalesDocumentType,
  fromId: string,
  toType: SalesDocumentType,
  toId: string,
  selections?: LineQuantitySelection[],
): Promise<SalesDocumentLine[]> {
  const source = await client.query<SalesDocumentLine>(
    `SELECT * FROM sales_document_lines
     WHERE tenant_id = $1 AND parent_type = $2 AND parent_id = $3
     ORDER BY sort_order ASC, created_at ASC`,
    [tenantId, fromType, fromId],
  );

  const selectionMap = selections
    ? new Map(selections.map((s) => [s.lineId, s.quantity]))
    : null;

  const inserted: SalesDocumentLine[] = [];
  for (const line of source.rows) {
    const qty = selectionMap ? selectionMap.get(line.id) : Number(line.quantity);
    if (selectionMap && (qty === undefined || qty <= 0)) continue;
    const quantity = selectionMap ? qty! : Number(line.quantity);
    const taxRate = Number(line.tax_rate);
    const unitPrice = Number(line.unit_price);
    const totals = computeLineTotals(quantity, unitPrice, taxRate);
    const result = await client.query<SalesDocumentLine>(
      `INSERT INTO sales_document_lines (
         tenant_id, parent_type, parent_id, item_id, description,
         quantity, unit_price, tax_rate, line_subtotal, line_tax, line_total, sort_order, source_line_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        tenantId,
        toType,
        toId,
        line.item_id,
        line.description,
        quantity,
        unitPrice,
        taxRate,
        totals.lineSubtotal,
        totals.lineTax,
        totals.lineTotal,
        line.sort_order,
        line.id,
      ],
    );
    inserted.push(result.rows[0]!);
  }
  return inserted;
}

export async function getLineFulfillment(
  tenantId: string,
  parentType: SalesDocumentType,
  parentId: string,
): Promise<Array<{ lineId: string; ordered: number; fulfilled: number; remaining: number }>> {
  const childType: SalesDocumentType | null =
    parentType === 'ORDER' ? 'DELIVERY_NOTE' : parentType === 'DELIVERY_NOTE' ? 'INVOICE' : null;

  const lines = await pool.query<SalesDocumentLine>(
    `SELECT * FROM sales_document_lines
     WHERE tenant_id = $1 AND parent_type = $2 AND parent_id = $3
     ORDER BY sort_order ASC`,
    [tenantId, parentType, parentId],
  );

  const fulfilledMap = new Map<string, number>();
  if (childType) {
    const fulfilled = await pool.query<{ source_line_id: string; qty: string }>(
      `SELECT source_line_id, COALESCE(SUM(quantity), 0)::text AS qty
       FROM sales_document_lines
       WHERE tenant_id = $1 AND source_line_id IS NOT NULL AND parent_type = $2
       GROUP BY source_line_id`,
      [tenantId, childType],
    );
    for (const row of fulfilled.rows) {
      fulfilledMap.set(row.source_line_id, Number(row.qty));
    }
  }

  return lines.rows.map((line) => {
    const ordered = Number(line.quantity);
    const done = fulfilledMap.get(line.id) ?? 0;
    return {
      lineId: line.id,
      ordered,
      fulfilled: done,
      remaining: Math.max(0, roundQty(ordered - done)),
    };
  });
}

function roundQty(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export async function findDocumentChain(
  tenantId: string,
  kind: 'quote' | 'order' | 'delivery-note' | 'invoice',
  documentId: string,
): Promise<DocumentChain> {
  let quoteId: string | null = null;
  let orderId: string | null = null;

  if (kind === 'quote') quoteId = documentId;
  if (kind === 'order') {
    const o = await pool.query<{ quote_id: string | null }>(
      `SELECT quote_id FROM sales_orders WHERE id = $1 AND tenant_id = $2`,
      [documentId, tenantId],
    );
    orderId = documentId;
    quoteId = o.rows[0]?.quote_id ?? null;
  }
  if (kind === 'delivery-note') {
    const d = await pool.query<{ order_id: string | null }>(
      `SELECT order_id FROM sales_delivery_notes WHERE id = $1 AND tenant_id = $2`,
      [documentId, tenantId],
    );
    orderId = d.rows[0]?.order_id ?? null;
    if (orderId) {
      const o = await pool.query<{ quote_id: string | null }>(
        `SELECT quote_id FROM sales_orders WHERE id = $1`,
        [orderId],
      );
      quoteId = o.rows[0]?.quote_id ?? null;
    }
  }
  if (kind === 'invoice') {
    const i = await pool.query<{ order_id: string | null; quote_id: string | null }>(
      `SELECT order_id, quote_id FROM sales_invoices WHERE id = $1 AND tenant_id = $2`,
      [documentId, tenantId],
    );
    orderId = i.rows[0]?.order_id ?? null;
    quoteId = i.rows[0]?.quote_id ?? null;
  }

  const quote = quoteId
    ? await pool.query<ChainDocumentRef>(
        `SELECT id, document_number, status::text AS status FROM sales_quotes
         WHERE id = $1 AND tenant_id = $2`,
        [quoteId, tenantId],
      )
    : { rows: [] };
  const order =
    orderId ??
    (quoteId
      ? (
          await pool.query<{ id: string }>(
            `SELECT id FROM sales_orders WHERE quote_id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1`,
            [quoteId, tenantId],
          )
        ).rows[0]?.id
      : null);

  const orderRow = order
    ? await pool.query<ChainDocumentRef>(
        `SELECT id, document_number, status::text AS status FROM sales_orders
         WHERE id = $1 AND tenant_id = $2`,
        [order, tenantId],
      )
    : { rows: [] };

  const resolvedOrderId = orderRow.rows[0]?.id ?? null;
  const deliveryNotes = resolvedOrderId
    ? await pool.query<ChainDocumentRef>(
        `SELECT id, document_number, status::text AS status FROM sales_delivery_notes
         WHERE order_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         ORDER BY created_at ASC`,
        [resolvedOrderId, tenantId],
      )
    : { rows: [] };

  const invoices = resolvedOrderId
    ? await pool.query<ChainDocumentRef>(
        `SELECT id, document_number, status::text AS status FROM sales_invoices
         WHERE order_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         ORDER BY created_at ASC`,
        [resolvedOrderId, tenantId],
      )
    : { rows: [] };

  return {
    quote: quote.rows[0] ?? null,
    order: orderRow.rows[0] ?? null,
    deliveryNotes: deliveryNotes.rows,
    invoices: invoices.rows,
  };
}

export async function adjustStockForDeliveryNote(
  client: PoolClient,
  tenantId: string,
  lines: SalesDocumentLine[],
): Promise<void> {
  for (const line of lines) {
    if (!line.item_id) continue;
    await client.query(
      `UPDATE items SET stock_quantity = stock_quantity - $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 AND track_stock = TRUE AND deleted_at IS NULL`,
      [line.quantity, line.item_id, tenantId],
    );
  }
}

export async function isOrderFullyFulfilled(
  client: PoolClient,
  tenantId: string,
  orderId: string,
): Promise<boolean> {
  const fulfillment = await getLineFulfillment(tenantId, 'ORDER', orderId);
  return fulfillment.every((f) => f.remaining <= 0.0001);
}

export async function isDdtFullyInvoiced(
  client: PoolClient,
  tenantId: string,
  ddtId: string,
): Promise<boolean> {
  const fulfillment = await getLineFulfillment(tenantId, 'DELIVERY_NOTE', ddtId);
  return fulfillment.every((f) => f.remaining <= 0.0001);
}

export { copyLinesWithSource };

export async function updateParentTotalsFromLines(
  client: PoolClient,
  table: 'sales_orders' | 'sales_delivery_notes' | 'sales_invoices',
  parentId: string,
  tenantId: string,
  lines: SalesDocumentLine[],
): Promise<void> {
  const { subtotal, taxTotal, total } = sumLineTotals(lines);
  await client.query(
    `UPDATE ${table} SET subtotal = $1, tax_total = $2, total = $3, updated_at = NOW()
     WHERE id = $4 AND tenant_id = $5`,
    [subtotal, taxTotal, total, parentId, tenantId],
  );
}

export async function replaceInvoiceLines(
  client: PoolClient,
  tenantId: string,
  invoiceId: string,
  lines: LineInput[],
  defaultTaxRate: number,
): Promise<SalesDocumentLine[]> {
  await client.query(
    `DELETE FROM sales_document_lines
     WHERE tenant_id = $1 AND parent_type = 'INVOICE' AND parent_id = $2`,
    [tenantId, invoiceId],
  );
  const inserted: SalesDocumentLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const taxRate = line.taxRate ?? defaultTaxRate;
    const totals = computeLineTotals(line.quantity, line.unitPrice, taxRate);
    const result = await client.query<SalesDocumentLine>(
      `INSERT INTO sales_document_lines (
         tenant_id, parent_type, parent_id, item_id, description,
         quantity, unit_price, tax_rate, line_subtotal, line_tax, line_total, sort_order
       ) VALUES ($1, 'INVOICE', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        tenantId,
        invoiceId,
        line.itemId ?? null,
        line.description,
        line.quantity,
        line.unitPrice,
        taxRate,
        totals.lineSubtotal,
        totals.lineTax,
        totals.lineTotal,
        line.sortOrder ?? i,
      ],
    );
    inserted.push(result.rows[0]!);
  }
  return inserted;
}

export type { SalesQuote, SalesOrder, SalesDeliveryNote, SalesInvoice };
