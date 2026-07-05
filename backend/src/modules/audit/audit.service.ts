import * as auditRepo from './audit.repository.js';

export interface AuditContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logEvent(input: auditRepo.AuditLogInput): Promise<void> {
  try {
    await auditRepo.createAuditLog(input);
  } catch (err) {
    console.error('[audit] failed to persist audit log', err);
  }
}
