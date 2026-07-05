export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type Language = 'it' | 'en' | 'el';
export type TenantStatus = 'ACTIVE' | 'SUSPENDED';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'CLOSED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  email: string;
  tenant_id: string;
  role: Role;
  language: Language;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Item {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  stock_quantity: string;
  track_stock: boolean;
  unit_price: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ApiError {
  code: string;
  messageKey: string;
  context?: Record<string, unknown>;
}

export interface RegisterPayload {
  email: string;
  password: string;
  tenantName: string;
  language?: Language;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ItemPayload {
  name: string;
  description?: string | null;
  stockQuantity?: number;
  trackStock?: boolean;
  unitPrice?: number | null;
}

export type TenantRole = 'ADMIN' | 'USER';

export interface InviteUserPayload {
  email: string;
  role?: TenantRole;
}

export interface InviteResult {
  email: string;
  role: Role;
  inviteUrl: string;
  expiresAt: string;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: Role;
  expires_at: string;
  created_at: string;
}

export interface InvitationPreview {
  email: string;
  role: Role;
  tenantName: string;
  expiresAt: string;
}

export interface AcceptInvitationPayload {
  token: string;
  password: string;
  language?: Language;
}

export interface SupportTicket {
  id: string;
  tenant_id: string;
  created_by: string;
  ticket_number: number;
  subject: string;
  description: string;
  contact_email: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  assigned_to?: string | null;
  unread_by_staff?: boolean;
  tenant_name?: string;
  author_email?: string;
  messages_count?: number;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  tenant_id: string;
  author_id: string;
  body: string;
  is_staff: boolean;
  created_at: string;
  author_email?: string;
}

export interface TicketDetail {
  ticket: SupportTicket;
  messages: TicketMessage[];
}

export interface TicketPayload {
  subject: string;
  description: string;
  priority?: TicketPriority;
}

export interface TenantStats {
  items: number;
  openTickets: number;
  users: number;
}

export interface OnboardingSteps {
  createFirstItem: boolean;
  inviteColleague: boolean;
  setLanguage: boolean;
}

export interface OnboardingStatus {
  steps: OnboardingSteps;
  completed: boolean;
  dismissed: boolean;
}

export interface PlatformStats {
  companies: number;
  openTickets: number;
  activeCompanies: number;
  unreadTickets: number;
  expiringContracts: number;
}

export interface TicketListFilters {
  status?: TicketStatus;
  unreadOnly?: boolean;
}

export interface Company {
  id: string;
  name: string;
  status: TenantStatus;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
  users_count: number;
  open_tickets_count: number;
}

export interface UpdateCompanyPayload {
  name?: string;
  contactEmail?: string | null;
  status?: TenantStatus;
}

export interface CreateCompanyPayload {
  name: string;
  contactEmail?: string | null;
  adminEmail: string;
  language?: Language;
}

export interface CreateCompanyResult {
  company: Company;
  adminInvitation: InviteResult;
}

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
export type ContractRenewalType = 'NONE' | 'MONTHLY' | 'YEARLY';

export interface CompanyContract {
  id: string;
  tenant_id: string;
  title: string;
  contract_number: string | null;
  status: ContractStatus;
  starts_at: string;
  ends_at: string | null;
  signed_at: string | null;
  amount: string | null;
  currency: string;
  auto_renew: boolean;
  renewal_type: ContractRenewalType;
  notes: string | null;
  document_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  tenant_name?: string;
}

export interface CompanyContractPayload {
  tenantId: string;
  title: string;
  contractNumber?: string | null;
  status?: ContractStatus;
  startsAt: string;
  endsAt?: string | null;
  signedAt?: string | null;
  amount?: number | null;
  currency?: string;
  autoRenew?: boolean;
  renewalType?: ContractRenewalType;
  notes?: string | null;
  documentUrl?: string | null;
}

export interface ContractRenewalRecord {
  id: string;
  contract_id: string;
  renewed_by: string | null;
  previous_starts_at: string;
  previous_ends_at: string | null;
  previous_amount: string | null;
  previous_status: ContractStatus;
  new_starts_at: string;
  new_ends_at: string | null;
  new_amount: string | null;
  notes: string | null;
  renewed_at: string;
  renewed_by_email?: string;
}

export interface CompanyContractDetail {
  contract: CompanyContract;
  renewals: ContractRenewalRecord[];
}

export interface RenewContractPayload {
  newEndsAt?: string;
  newAmount?: number | null;
  notes?: string | null;
}

export interface ContractListFilters {
  tenantId?: string;
  status?: ContractStatus;
  expiringInDays?: number;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

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
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  deleted_at: string | null;
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
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  author_email?: string;
}

export interface CrmContactDetail {
  contact: CrmContact;
  activities: CrmActivity[];
  deals: CrmDeal[];
}

export interface CrmStats {
  contacts: number;
  leads: number;
  customers: number;
  openDeals: number;
  pipelineValue: number;
  wonValue: number;
  dealsByStage: Record<DealStage, number>;
  recentActivities: CrmActivity[];
}

export interface ContactPayload {
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
}

export interface DealPayload {
  contactId?: string | null;
  title: string;
  value: number;
  currency?: string;
  stage?: DealStage;
  expectedCloseDate?: string | null;
  notes?: string | null;
}

export interface ActivityPayload {
  contactId?: string | null;
  dealId?: string | null;
  activityType: ActivityType;
  subject: string;
  body?: string | null;
  dueAt?: string | null;
}

export type CalendarEventType = 'CALL' | 'MEETING' | 'APPOINTMENT';

export interface CalendarEvent {
  id: string;
  tenant_id: string;
  created_by: string;
  owner_id: string;
  title: string;
  description: string | null;
  event_type: CalendarEventType;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  location: string | null;
  contact_id: string | null;
  company_name: string | null;
  target_tenant_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  owner_email?: string;
  contact_name?: string;
  target_tenant_name?: string | null;
  shared_from_platform?: boolean;
}

export interface CalendarEventPayload {
  title: string;
  description?: string | null;
  eventType: CalendarEventType;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  location?: string | null;
  contactId?: string | null;
  companyName?: string | null;
  targetTenantId?: string | null;
  ownerId?: string;
}

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'CONVERTED';
export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'FULFILLED' | 'CANCELLED' | 'CONVERTED';
export type DeliveryNoteStatus = 'DRAFT' | 'ISSUED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'INVOICED';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'SENT' | 'PAID' | 'CANCELLED';
export type SdiStatus = 'NOT_SENT' | 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface SalesDocumentLine {
  id: string;
  tenant_id: string;
  parent_type: string;
  parent_id: string;
  item_id: string | null;
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
  line_subtotal: string;
  line_tax: string;
  line_total: string;
  sort_order: number;
  created_at: string;
}

export interface SalesQuote {
  id: string;
  tenant_id: string;
  owner_id: string;
  contact_id: string | null;
  deal_id: string | null;
  document_number: string;
  status: QuoteStatus;
  customer_company_name: string | null;
  customer_name: string | null;
  customer_vat_number: string | null;
  customer_tax_code: string | null;
  customer_email: string | null;
  customer_address: string | null;
  customer_sdi_code: string | null;
  customer_pec_email: string | null;
  subtotal: string;
  tax_total: string;
  total: string;
  default_tax_rate: string;
  currency: string;
  notes: string | null;
  valid_until: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
  contact_name?: string;
}

export interface SalesOrder {
  id: string;
  tenant_id: string;
  owner_id: string;
  quote_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  document_number: string;
  status: OrderStatus;
  customer_company_name: string | null;
  customer_name: string | null;
  customer_vat_number: string | null;
  customer_tax_code: string | null;
  customer_email: string | null;
  customer_address: string | null;
  customer_sdi_code: string | null;
  customer_pec_email: string | null;
  subtotal: string;
  tax_total: string;
  total: string;
  default_tax_rate: string;
  currency: string;
  notes: string | null;
  order_date: string | null;
  expected_delivery_date: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
  contact_name?: string;
  quote_number?: string;
}

export interface SalesDeliveryNote {
  id: string;
  tenant_id: string;
  owner_id: string;
  order_id: string | null;
  contact_id: string | null;
  document_number: string;
  status: DeliveryNoteStatus;
  customer_company_name: string | null;
  customer_name: string | null;
  customer_vat_number: string | null;
  customer_tax_code: string | null;
  customer_email: string | null;
  customer_address: string | null;
  customer_sdi_code: string | null;
  customer_pec_email: string | null;
  subtotal: string;
  tax_total: string;
  total: string;
  default_tax_rate: string;
  currency: string;
  notes: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
  contact_name?: string;
  order_number?: string;
}

export interface SalesInvoice {
  id: string;
  tenant_id: string;
  owner_id: string;
  delivery_note_id: string | null;
  order_id: string | null;
  quote_id: string | null;
  contact_id: string | null;
  document_number: string;
  status: InvoiceStatus;
  sdi_status: SdiStatus;
  customer_company_name: string | null;
  customer_name: string | null;
  customer_vat_number: string | null;
  customer_tax_code: string | null;
  customer_email: string | null;
  customer_address: string | null;
  customer_sdi_code: string | null;
  customer_pec_email: string | null;
  subtotal: string;
  tax_total: string;
  total: string;
  default_tax_rate: string;
  currency: string;
  notes: string | null;
  invoice_date: string | null;
  due_date: string | null;
  payment_method: string | null;
  payment_status: PaymentStatus;
  paid_amount: string;
  paid_at: string | null;
  sdi_sent_at: string | null;
  sdi_message_id: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
  contact_name?: string;
  delivery_note_number?: string;
}

export interface SalesStats {
  quotes: number;
  orders: number;
  deliveryNotes: number;
  invoices: number;
  draftInvoices: number;
  pipelineTotal: number;
}

export interface SalesLinePayload {
  itemId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface QuotePayload {
  contactId?: string | null;
  dealId?: string | null;
  customerCompanyName?: string | null;
  customerName?: string | null;
  customerVatNumber?: string | null;
  customerTaxCode?: string | null;
  customerSdiCode?: string | null;
  customerPecEmail?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  defaultTaxRate?: number;
  currency?: string;
  notes?: string | null;
  validUntil?: string | null;
  lines: SalesLinePayload[];
}

export interface VatValidationResult {
  valid: boolean;
  normalized: string | null;
  countryCode: string;
  vatNumber: string;
  checksumValid: boolean;
  viesValid: boolean | null;
  viesName: string | null;
  viesAddress: string | null;
}

export interface FiscalProfile {
  tenant_id: string;
  legal_name: string;
  vat_number: string;
  tax_code: string | null;
  fiscal_regime: string;
  address: string | null;
  city: string | null;
  zip_code: string | null;
  province: string | null;
  country: string;
  sdi_code: string | null;
  pec_email: string | null;
  default_payment_days?: number;
  created_at: string;
  updated_at: string;
}

export interface FiscalProfilePayload {
  legalName: string;
  vatNumber: string;
  taxCode?: string | null;
  fiscalRegime?: string;
  address?: string | null;
  city?: string | null;
  zipCode?: string | null;
  province?: string | null;
  country?: string;
  sdiCode?: string | null;
  pecEmail?: string | null;
  defaultPaymentDays?: number;
}

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

export interface LineFulfillment {
  lineId: string;
  ordered: number;
  fulfilled: number;
  remaining: number;
}

export interface ConvertDocumentOptions {
  skipDdt?: boolean;
  paymentDays?: number;
  lines?: Array<{ lineId: string; quantity: number }>;
}

export interface SalesPipelineData {
  quotes: SalesQuote[];
  orders: SalesOrder[];
  deliveryNotes: SalesDeliveryNote[];
  invoices: SalesInvoice[];
}

export interface PassiveInvoice {
  id: string;
  tenant_id: string;
  supplier_name: string;
  supplier_vat_number: string | null;
  supplier_tax_code: string | null;
  document_number: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: string;
  tax_total: string;
  total: string;
  currency: string;
  sdi_status: string;
  payment_status: PaymentStatus;
  paid_amount: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PassiveInvoicePayload {
  supplierName: string;
  supplierVatNumber?: string | null;
  supplierTaxCode?: string | null;
  documentNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  subtotal?: number;
  taxTotal?: number;
  total: number;
  currency?: string;
  notes?: string | null;
}

export interface FiscalDashboardStats extends SalesStats {
  overdueInvoices: number;
  passiveInvoices: number;
  unpaidPassive: number;
}

export interface SalesListFilters {
  status?: string;
  search?: string;
  contactId?: string;
}

export interface ContactDocumentSummary {
  id: string;
  document_type: 'QUOTE' | 'ORDER' | 'DELIVERY_NOTE' | 'INVOICE';
  document_number: string;
  status: string;
  total: string;
  currency: string;
  created_at: string;
}

export interface ScadenzarioEntry {
  id: string;
  entry_type: 'ACTIVE' | 'PASSIVE';
  counterparty: string;
  document_number: string;
  due_date: string;
  total: string;
  currency: string;
  payment_status: PaymentStatus;
  paid_amount: string;
}
