export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type Language = 'it' | 'en' | 'el';
export type TenantStatus = 'ACTIVE' | 'SUSPENDED';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'CLOSED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: Role;
  language: Language;
  tokenVersion: number;
}

export interface RequestContext {
  userId: string;
  tenantId: string;
  role: Role;
  language: Language;
}

export interface Tenant {
  id: string;
  name: string;
  status: TenantStatus;
  contact_email: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TenantWithStats extends Tenant {
  users_count: number;
  open_tickets_count: number;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  tenant_id: string;
  role: Role;
  language: Language;
  token_version: number;
  is_active: boolean;
  created_at: Date;
  deactivated_at: Date | null;
}

export interface UserPublic {
  id: string;
  email: string;
  tenant_id: string;
  role: Role;
  language: Language;
  created_at: Date;
}

export interface Item {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  stock_quantity: string;
  track_stock: boolean;
  unit_price: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
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
  created_at: Date;
  updated_at: Date;
  closed_at: Date | null;
  assigned_to?: string | null;
  unread_by_staff?: boolean;
}

export interface SupportTicketWithMeta extends SupportTicket {
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
  created_at: Date;
  author_email?: string;
}

export interface ApiErrorBody {
  code: string;
  messageKey: string;
  context?: Record<string, unknown>;
}
