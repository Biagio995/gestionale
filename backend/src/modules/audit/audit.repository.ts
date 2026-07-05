import { pool } from '../../db/pool.js';

export interface AuditLogInput {
  tenantId?: string | null;
  userId?: string | null;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  context?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  await pool.query(
    `INSERT INTO audit_logs (
       tenant_id, user_id, event_type, entity_type, entity_id, context, ip_address, user_agent
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
    [
      input.tenantId ?? null,
      input.userId ?? null,
      input.eventType,
      input.entityType ?? null,
      input.entityId ?? null,
      JSON.stringify(input.context ?? {}),
      input.ipAddress ?? null,
      input.userAgent ?? null,
    ],
  );
}
