import { pool } from '../../db/pool.js';

export type ContactStatus = 'LEAD' | 'CUSTOMER' | 'INACTIVE';
export type DealStage = 'LEAD' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK';

export interface CrmContact {
  id: string;
  tenant_id: string;
  owner_id: string;
  company_name: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  status: ContactStatus;
  notes: string | null;
  vat_number: string | null;
  tax_code: string | null;
  sdi_code: string | null;
  pec_email: string | null;
  address: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  owner_email?: string;
  deals_count?: number;
}

export interface CrmDeal {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  owner_id: string;
  title: string;
  value: string;
  currency: string;
  stage: DealStage;
  expected_close_date: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  closed_at: Date | null;
  deleted_at: Date | null;
  contact_name?: string;
  company_name?: string;
  owner_email?: string;
}

export interface CrmActivity {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  deal_id: string | null;
  created_by: string;
  activity_type: ActivityType;
  subject: string;
  body: string | null;
  due_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  author_email?: string;
}

const contactSelect = `
  SELECT c.*, u.email AS owner_email,
         (SELECT COUNT(*)::int FROM crm_deals d WHERE d.contact_id = c.id AND d.deleted_at IS NULL) AS deals_count
  FROM crm_contacts c
  JOIN users u ON u.id = c.owner_id
`;

const dealSelect = `
  SELECT d.*,
         NULLIF(TRIM(CONCAT(ct.first_name, ' ', ct.last_name)), '') AS contact_name,
         ct.company_name,
         u.email AS owner_email
  FROM crm_deals d
  LEFT JOIN crm_contacts ct ON ct.id = d.contact_id
  JOIN users u ON u.id = d.owner_id
`;

export async function findContactsByTenant(tenantId: string, status?: ContactStatus): Promise<CrmContact[]> {
  const params: unknown[] = [tenantId];
  let sql = `${contactSelect} WHERE c.tenant_id = $1 AND c.deleted_at IS NULL`;
  if (status) {
    params.push(status);
    sql += ` AND c.status = $${params.length}`;
  }
  sql += ' ORDER BY c.updated_at DESC';
  const result = await pool.query<CrmContact>(sql, params);
  return result.rows;
}

export async function findContactByIdAndTenant(
  contactId: string,
  tenantId: string,
): Promise<CrmContact | null> {
  const result = await pool.query<CrmContact>(
    `${contactSelect} WHERE c.id = $1 AND c.tenant_id = $2 AND c.deleted_at IS NULL`,
    [contactId, tenantId],
  );
  return result.rows[0] ?? null;
}

export async function createContact(input: {
  tenantId: string;
  ownerId: string;
  companyName?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  status?: ContactStatus;
  notes?: string | null;
  vatNumber?: string | null;
  taxCode?: string | null;
  sdiCode?: string | null;
  pecEmail?: string | null;
  address?: string | null;
}): Promise<CrmContact> {
  const result = await pool.query<CrmContact>(
    `INSERT INTO crm_contacts (
       tenant_id, owner_id, company_name, first_name, last_name,
       email, phone, job_title, status, notes,
       vat_number, tax_code, sdi_code, pec_email, address
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      input.tenantId,
      input.ownerId,
      input.companyName ?? null,
      input.firstName,
      input.lastName,
      input.email?.toLowerCase() ?? null,
      input.phone ?? null,
      input.jobTitle ?? null,
      input.status ?? 'LEAD',
      input.notes ?? null,
      input.vatNumber ?? null,
      input.taxCode ?? null,
      input.sdiCode ?? null,
      input.pecEmail ?? null,
      input.address ?? null,
    ],
  );
  const created = await findContactByIdAndTenant(result.rows[0]!.id, input.tenantId);
  return created!;
}

export async function updateContact(input: {
  contactId: string;
  tenantId: string;
  companyName?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  status?: ContactStatus;
  notes?: string | null;
  ownerId?: string;
  vatNumber?: string | null;
  taxCode?: string | null;
  sdiCode?: string | null;
  pecEmail?: string | null;
  address?: string | null;
}): Promise<CrmContact | null> {
  const result = await pool.query<CrmContact>(
    `UPDATE crm_contacts SET
       company_name = COALESCE($3, company_name),
       first_name = COALESCE($4, first_name),
       last_name = COALESCE($5, last_name),
       email = COALESCE($6, email),
       phone = COALESCE($7, phone),
       job_title = COALESCE($8, job_title),
       status = COALESCE($9, status),
       notes = COALESCE($10, notes),
       owner_id = COALESCE($11, owner_id),
       vat_number = COALESCE($12, vat_number),
       tax_code = COALESCE($13, tax_code),
       sdi_code = COALESCE($14, sdi_code),
       pec_email = COALESCE($15, pec_email),
       address = COALESCE($16, address),
       updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [
      input.contactId,
      input.tenantId,
      input.companyName,
      input.firstName,
      input.lastName,
      input.email?.toLowerCase() ?? input.email,
      input.phone,
      input.jobTitle,
      input.status,
      input.notes,
      input.ownerId,
      input.vatNumber,
      input.taxCode,
      input.sdiCode,
      input.pecEmail,
      input.address,
    ],
  );
  if (!result.rows[0]) return null;
  return findContactByIdAndTenant(input.contactId, input.tenantId);
}

export async function softDeleteContact(contactId: string, tenantId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE crm_contacts SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [contactId, tenantId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function findDealsByTenant(
  tenantId: string,
  filters?: { stage?: DealStage; contactId?: string },
): Promise<CrmDeal[]> {
  const params: unknown[] = [tenantId];
  let sql = `${dealSelect} WHERE d.tenant_id = $1 AND d.deleted_at IS NULL`;
  if (filters?.stage) {
    params.push(filters.stage);
    sql += ` AND d.stage = $${params.length}`;
  }
  if (filters?.contactId) {
    params.push(filters.contactId);
    sql += ` AND d.contact_id = $${params.length}`;
  }
  sql += ` ORDER BY
    CASE d.stage
      WHEN 'NEGOTIATION' THEN 1 WHEN 'PROPOSAL' THEN 2 WHEN 'QUALIFIED' THEN 3
      WHEN 'LEAD' THEN 4 WHEN 'WON' THEN 5 ELSE 6
    END,
    d.updated_at DESC`;
  const result = await pool.query<CrmDeal>(sql, params);
  return result.rows;
}

export async function findDealByIdAndTenant(
  dealId: string,
  tenantId: string,
): Promise<CrmDeal | null> {
  const result = await pool.query<CrmDeal>(
    `${dealSelect} WHERE d.id = $1 AND d.tenant_id = $2 AND d.deleted_at IS NULL`,
    [dealId, tenantId],
  );
  return result.rows[0] ?? null;
}

export async function createDeal(input: {
  tenantId: string;
  ownerId: string;
  contactId?: string | null;
  title: string;
  value: number;
  currency?: string;
  stage?: DealStage;
  expectedCloseDate?: string | null;
  notes?: string | null;
}): Promise<CrmDeal> {
  const result = await pool.query<CrmDeal>(
    `INSERT INTO crm_deals (
       tenant_id, contact_id, owner_id, title, value, currency, stage,
       expected_close_date, notes
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.tenantId,
      input.contactId ?? null,
      input.ownerId,
      input.title,
      input.value,
      input.currency ?? 'EUR',
      input.stage ?? 'LEAD',
      input.expectedCloseDate ?? null,
      input.notes ?? null,
    ],
  );
  const created = await findDealByIdAndTenant(result.rows[0]!.id, input.tenantId);
  return created!;
}

export async function updateDeal(input: {
  dealId: string;
  tenantId: string;
  contactId?: string | null;
  title?: string;
  value?: number;
  currency?: string;
  stage?: DealStage;
  expectedCloseDate?: string | null;
  notes?: string | null;
  ownerId?: string;
}): Promise<CrmDeal | null> {
  const result = await pool.query(
    `UPDATE crm_deals SET
       contact_id = COALESCE($3, contact_id),
       title = COALESCE($4, title),
       value = COALESCE($5, value),
       currency = COALESCE($6, currency),
       stage = COALESCE($7, stage),
       expected_close_date = COALESCE($8, expected_close_date),
       notes = COALESCE($9, notes),
       owner_id = COALESCE($10, owner_id),
       closed_at = CASE
         WHEN $7::text IN ('WON', 'LOST') THEN COALESCE(closed_at, NOW())
         WHEN $7::text IS NOT NULL AND $7::text NOT IN ('WON', 'LOST') THEN NULL
         ELSE closed_at
       END,
       updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [
      input.dealId,
      input.tenantId,
      input.contactId,
      input.title,
      input.value,
      input.currency,
      input.stage,
      input.expectedCloseDate,
      input.notes,
      input.ownerId,
    ],
  );
  if ((result.rowCount ?? 0) === 0) return null;
  return findDealByIdAndTenant(input.dealId, input.tenantId);
}

export async function softDeleteDeal(dealId: string, tenantId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE crm_deals SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [dealId, tenantId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function findActivitiesByContact(
  contactId: string,
  tenantId: string,
): Promise<CrmActivity[]> {
  const result = await pool.query<CrmActivity>(
    `SELECT a.*, u.email AS author_email
     FROM crm_activities a
     JOIN users u ON u.id = a.created_by
     WHERE a.contact_id = $1 AND a.tenant_id = $2
     ORDER BY a.created_at DESC`,
    [contactId, tenantId],
  );
  return result.rows;
}

export async function createActivity(input: {
  tenantId: string;
  createdBy: string;
  contactId?: string | null;
  dealId?: string | null;
  activityType: ActivityType;
  subject: string;
  body?: string | null;
  dueAt?: Date | null;
}): Promise<CrmActivity> {
  const result = await pool.query<CrmActivity>(
    `INSERT INTO crm_activities (
       tenant_id, contact_id, deal_id, created_by, activity_type, subject, body, due_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.tenantId,
      input.contactId ?? null,
      input.dealId ?? null,
      input.createdBy,
      input.activityType,
      input.subject,
      input.body ?? null,
      input.dueAt ?? null,
    ],
  );
  const row = result.rows[0]!;
  if (input.contactId) {
    await pool.query(
      `UPDATE crm_contacts SET updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [input.contactId, input.tenantId],
    );
  }
  if (input.dealId) {
    await pool.query(
      `UPDATE crm_deals SET updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [input.dealId, input.tenantId],
    );
  }
  return row;
}

export async function getCrmStats(tenantId: string): Promise<{
  contacts: number;
  leads: number;
  customers: number;
  openDeals: number;
  pipelineValue: number;
  wonValue: number;
  dealsByStage: Record<DealStage, number>;
  recentActivities: CrmActivity[];
}> {
  const [contacts, leads, customers, openDeals, pipeline, won, stages, activities] =
    await Promise.all([
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM crm_contacts WHERE tenant_id = $1 AND deleted_at IS NULL`,
        [tenantId],
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM crm_contacts WHERE tenant_id = $1 AND status = 'LEAD' AND deleted_at IS NULL`,
        [tenantId],
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM crm_contacts WHERE tenant_id = $1 AND status = 'CUSTOMER' AND deleted_at IS NULL`,
        [tenantId],
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM crm_deals
         WHERE tenant_id = $1 AND deleted_at IS NULL AND stage NOT IN ('WON', 'LOST')`,
        [tenantId],
      ),
      pool.query<{ total: string }>(
        `SELECT COALESCE(SUM(value), 0)::text AS total FROM crm_deals
         WHERE tenant_id = $1 AND deleted_at IS NULL AND stage NOT IN ('WON', 'LOST')`,
        [tenantId],
      ),
      pool.query<{ total: string }>(
        `SELECT COALESCE(SUM(value), 0)::text AS total FROM crm_deals
         WHERE tenant_id = $1 AND deleted_at IS NULL AND stage = 'WON'`,
        [tenantId],
      ),
      pool.query<{ stage: DealStage; count: string }>(
        `SELECT stage, COUNT(*)::text AS count FROM crm_deals
         WHERE tenant_id = $1 AND deleted_at IS NULL
         GROUP BY stage`,
        [tenantId],
      ),
      pool.query<CrmActivity>(
        `SELECT a.*, u.email AS author_email
         FROM crm_activities a
         JOIN users u ON u.id = a.created_by
         WHERE a.tenant_id = $1
         ORDER BY a.created_at DESC
         LIMIT 8`,
        [tenantId],
      ),
    ]);

  const dealsByStage: Record<DealStage, number> = {
    LEAD: 0,
    QUALIFIED: 0,
    PROPOSAL: 0,
    NEGOTIATION: 0,
    WON: 0,
    LOST: 0,
  };
  for (const row of stages.rows) {
    dealsByStage[row.stage] = parseInt(row.count, 10);
  }

  return {
    contacts: parseInt(contacts.rows[0]?.count ?? '0', 10),
    leads: parseInt(leads.rows[0]?.count ?? '0', 10),
    customers: parseInt(customers.rows[0]?.count ?? '0', 10),
    openDeals: parseInt(openDeals.rows[0]?.count ?? '0', 10),
    pipelineValue: parseFloat(pipeline.rows[0]?.total ?? '0'),
    wonValue: parseFloat(won.rows[0]?.total ?? '0'),
    dealsByStage,
    recentActivities: activities.rows,
  };
}
