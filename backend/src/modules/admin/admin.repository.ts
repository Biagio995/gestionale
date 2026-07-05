import { pool } from '../../db/pool.js';
import { PLATFORM_TENANT_ID, isPlatformTenant } from '../../config/platform.js';
import type { TenantStatus, TenantWithStats } from '../../types/index.js';

export { isPlatformTenant };

export async function findAllTenants(): Promise<TenantWithStats[]> {
  const result = await pool.query<TenantWithStats>(
    `SELECT t.id, t.name, t.status, t.contact_email, t.created_at, t.updated_at,
            COUNT(DISTINCT u.id)::int AS users_count,
            COUNT(DISTINCT st.id) FILTER (WHERE st.status IN ('OPEN', 'IN_PROGRESS', 'WAITING'))::int AS open_tickets_count
     FROM tenants t
     LEFT JOIN users u ON u.tenant_id = t.id
     LEFT JOIN support_tickets st ON st.tenant_id = t.id
     WHERE t.id != $1
     GROUP BY t.id
     ORDER BY t.created_at DESC`,
    [PLATFORM_TENANT_ID],
  );
  return result.rows;
}

export async function findTenantById(tenantId: string): Promise<TenantWithStats | null> {
  const result = await pool.query<TenantWithStats>(
    `SELECT t.id, t.name, t.status, t.contact_email, t.created_at, t.updated_at,
            COUNT(DISTINCT u.id)::int AS users_count,
            COUNT(DISTINCT st.id) FILTER (WHERE st.status IN ('OPEN', 'IN_PROGRESS', 'WAITING'))::int AS open_tickets_count
     FROM tenants t
     LEFT JOIN users u ON u.tenant_id = t.id
     LEFT JOIN support_tickets st ON st.tenant_id = t.id
     WHERE t.id = $1 AND t.id != $2
     GROUP BY t.id`,
    [tenantId, PLATFORM_TENANT_ID],
  );
  return result.rows[0] ?? null;
}

export interface CreateTenantRecordInput {
  name: string;
  contactEmail?: string | null;
}

export async function createTenantRecord(input: CreateTenantRecordInput): Promise<TenantWithStats> {
  const result = await pool.query<TenantWithStats>(
    `INSERT INTO tenants (name, contact_email)
     VALUES ($1, $2)
     RETURNING id, name, status, contact_email, created_at, updated_at,
               0 AS users_count, 0 AS open_tickets_count`,
    [input.name, input.contactEmail ?? null],
  );
  return result.rows[0]!;
}

export async function updateTenantStatus(
  tenantId: string,
  status: TenantStatus,
): Promise<TenantWithStats | null> {
  const result = await pool.query(
    `UPDATE tenants SET status = $1, updated_at = NOW()
     WHERE id = $2 AND id != $3`,
    [status, tenantId, PLATFORM_TENANT_ID],
  );
  if ((result.rowCount ?? 0) === 0) return null;
  return findTenantById(tenantId);
}

export interface UpdateTenantInput {
  name?: string;
  contactEmail?: string | null;
  status?: TenantStatus;
}

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
export type ContractRenewalType = 'NONE' | 'MONTHLY' | 'YEARLY';

export interface CompanyContract {
  id: string;
  tenant_id: string;
  title: string;
  contract_number: string | null;
  status: ContractStatus;
  starts_at: Date;
  ends_at: Date | null;
  signed_at: Date | null;
  amount: string | null;
  currency: string;
  auto_renew: boolean;
  renewal_type: ContractRenewalType;
  notes: string | null;
  document_url: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  tenant_name?: string;
}

export interface ContractRenewalRecord {
  id: string;
  contract_id: string;
  renewed_by: string | null;
  previous_starts_at: Date;
  previous_ends_at: Date | null;
  previous_amount: string | null;
  previous_status: ContractStatus;
  new_starts_at: Date;
  new_ends_at: Date | null;
  new_amount: string | null;
  notes: string | null;
  renewed_at: Date;
  renewed_by_email?: string;
}

export async function updateTenant(
  tenantId: string,
  input: UpdateTenantInput,
): Promise<TenantWithStats | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.name !== undefined) {
    sets.push(`name = $${idx++}`);
    values.push(input.name);
  }
  if (input.contactEmail !== undefined) {
    sets.push(`contact_email = $${idx++}`);
    values.push(input.contactEmail);
  }
  if (input.status !== undefined) {
    sets.push(`status = $${idx++}`);
    values.push(input.status);
  }

  if (sets.length === 0) {
    return findTenantById(tenantId);
  }

  sets.push('updated_at = NOW()');
  values.push(tenantId, PLATFORM_TENANT_ID);

  const result = await pool.query(
    `UPDATE tenants SET ${sets.join(', ')}
     WHERE id = $${idx++} AND id != $${idx}`,
    values,
  );
  if ((result.rowCount ?? 0) === 0) return null;
  return findTenantById(tenantId);
}

export async function listContracts(filters?: {
  tenantId?: string;
  status?: ContractStatus;
  expiringInDays?: number;
}): Promise<CompanyContract[]> {
  const values: unknown[] = [PLATFORM_TENANT_ID];
  const where: string[] = ['c.deleted_at IS NULL', 'c.tenant_id != $1'];
  let idx = 2;

  if (filters?.tenantId) {
    where.push(`c.tenant_id = $${idx++}`);
    values.push(filters.tenantId);
  }
  if (filters?.status) {
    where.push(`c.status = $${idx++}`);
    values.push(filters.status);
  }
  if (typeof filters?.expiringInDays === 'number') {
    where.push(`c.status = 'ACTIVE'`);
    where.push(`c.ends_at IS NOT NULL`);
    where.push(`c.ends_at <= (CURRENT_DATE + ($${idx++} || ' days')::interval)`);
    values.push(String(filters.expiringInDays));
  }

  const result = await pool.query<CompanyContract>(
    `SELECT c.*, t.name AS tenant_name
     FROM company_contracts c
     JOIN tenants t ON t.id = c.tenant_id
     WHERE ${where.join(' AND ')}
     ORDER BY
       CASE c.status WHEN 'ACTIVE' THEN 1 WHEN 'DRAFT' THEN 2 WHEN 'EXPIRED' THEN 3 ELSE 4 END,
       c.ends_at ASC NULLS LAST,
       c.created_at DESC`,
    values,
  );
  return result.rows;
}

export async function findContractById(contractId: string): Promise<CompanyContract | null> {
  const result = await pool.query<CompanyContract>(
    `SELECT c.*, t.name AS tenant_name
     FROM company_contracts c
     JOIN tenants t ON t.id = c.tenant_id
     WHERE c.id = $1 AND c.deleted_at IS NULL AND c.tenant_id != $2`,
    [contractId, PLATFORM_TENANT_ID],
  );
  return result.rows[0] ?? null;
}

export async function countExpiringContracts(withinDays = 30): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM company_contracts
     WHERE deleted_at IS NULL
       AND tenant_id != $1
       AND status = 'ACTIVE'
       AND ends_at IS NOT NULL
       AND ends_at <= (CURRENT_DATE + ($2 || ' days')::interval)`,
    [PLATFORM_TENANT_ID, String(withinDays)],
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

export async function findRenewalsByContract(contractId: string): Promise<ContractRenewalRecord[]> {
  const result = await pool.query<ContractRenewalRecord>(
    `SELECT r.*, u.email AS renewed_by_email
     FROM contract_renewals r
     LEFT JOIN users u ON u.id = r.renewed_by
     WHERE r.contract_id = $1
     ORDER BY r.renewed_at DESC`,
    [contractId],
  );
  return result.rows;
}

export async function createContract(input: {
  tenantId: string;
  title: string;
  contractNumber?: string | null;
  status: ContractStatus;
  startsAt: string;
  endsAt?: string | null;
  signedAt?: string | null;
  amount?: number | null;
  currency?: string;
  autoRenew?: boolean;
  renewalType?: ContractRenewalType;
  notes?: string | null;
  documentUrl?: string | null;
  createdBy: string;
}): Promise<CompanyContract> {
  const result = await pool.query<CompanyContract>(
    `INSERT INTO company_contracts (
       tenant_id, title, contract_number, status, starts_at, ends_at, signed_at,
       amount, currency, auto_renew, renewal_type, notes, document_url, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      input.tenantId,
      input.title,
      input.contractNumber ?? null,
      input.status,
      input.startsAt,
      input.endsAt ?? null,
      input.signedAt ?? null,
      input.amount ?? null,
      input.currency ?? 'EUR',
      input.autoRenew ?? false,
      input.renewalType ?? 'NONE',
      input.notes ?? null,
      input.documentUrl ?? null,
      input.createdBy,
    ],
  );
  return (await findContractById(result.rows[0]!.id))!;
}

export async function updateContract(
  contractId: string,
  input: {
    title?: string;
    contractNumber?: string | null;
    status?: ContractStatus;
    startsAt?: string;
    endsAt?: string | null;
    signedAt?: string | null;
    amount?: number | null;
    currency?: string;
    autoRenew?: boolean;
    renewalType?: ContractRenewalType;
    notes?: string | null;
    documentUrl?: string | null;
  },
): Promise<CompanyContract | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.title !== undefined) { sets.push(`title = $${idx++}`); values.push(input.title); }
  if (input.contractNumber !== undefined) { sets.push(`contract_number = $${idx++}`); values.push(input.contractNumber); }
  if (input.status !== undefined) { sets.push(`status = $${idx++}`); values.push(input.status); }
  if (input.startsAt !== undefined) { sets.push(`starts_at = $${idx++}`); values.push(input.startsAt); }
  if (input.endsAt !== undefined) { sets.push(`ends_at = $${idx++}`); values.push(input.endsAt); }
  if (input.signedAt !== undefined) { sets.push(`signed_at = $${idx++}`); values.push(input.signedAt); }
  if (input.amount !== undefined) { sets.push(`amount = $${idx++}`); values.push(input.amount); }
  if (input.currency !== undefined) { sets.push(`currency = $${idx++}`); values.push(input.currency); }
  if (input.autoRenew !== undefined) { sets.push(`auto_renew = $${idx++}`); values.push(input.autoRenew); }
  if (input.renewalType !== undefined) { sets.push(`renewal_type = $${idx++}`); values.push(input.renewalType); }
  if (input.notes !== undefined) { sets.push(`notes = $${idx++}`); values.push(input.notes); }
  if (input.documentUrl !== undefined) { sets.push(`document_url = $${idx++}`); values.push(input.documentUrl); }

  if (sets.length === 0) {
    return findContractById(contractId);
  }

  sets.push('updated_at = NOW()');
  values.push(contractId, PLATFORM_TENANT_ID);

  const result = await pool.query(
    `UPDATE company_contracts SET ${sets.join(', ')}
     WHERE id = $${idx++} AND tenant_id != $${idx} AND deleted_at IS NULL`,
    values,
  );
  if ((result.rowCount ?? 0) === 0) return null;
  return findContractById(contractId);
}

export async function renewContract(input: {
  contractId: string;
  renewedBy: string;
  newStartsAt: string;
  newEndsAt: string | null;
  newAmount: number | null;
  notes?: string | null;
}): Promise<CompanyContract | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query<CompanyContract>(
      `SELECT * FROM company_contracts
       WHERE id = $1 AND deleted_at IS NULL AND tenant_id != $2
       FOR UPDATE`,
      [input.contractId, PLATFORM_TENANT_ID],
    );
    const contract = current.rows[0];
    if (!contract) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `INSERT INTO contract_renewals (
         contract_id, renewed_by,
         previous_starts_at, previous_ends_at, previous_amount, previous_status,
         new_starts_at, new_ends_at, new_amount, notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        contract.id,
        input.renewedBy,
        contract.starts_at,
        contract.ends_at,
        contract.amount,
        contract.status,
        input.newStartsAt,
        input.newEndsAt,
        input.newAmount,
        input.notes ?? null,
      ],
    );

    await client.query(
      `UPDATE company_contracts SET
         starts_at = $2,
         ends_at = $3,
         amount = COALESCE($4, amount),
         status = 'ACTIVE',
         updated_at = NOW()
       WHERE id = $1`,
      [contract.id, input.newStartsAt, input.newEndsAt, input.newAmount],
    );

    await client.query('COMMIT');
    return findContractById(contract.id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function softDeleteContract(contractId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE company_contracts
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND tenant_id != $2 AND deleted_at IS NULL`,
    [contractId, PLATFORM_TENANT_ID],
  );
  return (result.rowCount ?? 0) > 0;
}
