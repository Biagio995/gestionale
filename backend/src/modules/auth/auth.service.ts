import bcrypt from 'bcrypt';
import { z } from 'zod';
import type { JwtPayload, Language, RequestContext, User, UserPublic } from '../../types/index.js';
import { badRequest, conflict, notFound, unauthorized } from '../../utils/errors.js';
import { env } from '../../config/env.js';
import { sendPasswordResetEmail } from '../../services/mail.service.js';
import { signToken } from '../../utils/jwt.js';
import { logEvent } from '../audit/audit.service.js';
import * as invitationsRepo from '../users/invitations.repository.js';
import * as authRepo from './auth.repository.js';
import * as passwordResetRepo from './password-reset.repository.js';

const languageSchema = z.enum(['it', 'en', 'el']);
const roleSchema = z.enum(['SUPER_ADMIN', 'ADMIN', 'USER']);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantName: z.string().min(2).max(100),
  language: languageSchema.optional().default('it'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  language: languageSchema.optional().default('it'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

export interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

function toJwtPayload(user: Pick<User, 'id' | 'tenant_id' | 'role' | 'language' | 'token_version'>): JwtPayload {
  return {
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role,
    language: user.language,
    tokenVersion: user.token_version,
  };
}

function toPublicUser(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    tenant_id: user.tenant_id,
    role: user.role,
    language: user.language,
    created_at: user.created_at,
  };
}

export async function register(body: unknown, meta?: RequestMeta): Promise<AuthResponse> {
  const input = registerSchema.parse(body);

  const existing = await authRepo.findUserByEmail(input.email);
  if (existing) {
    throw conflict('errors.emailExists');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const { tenant, user: fullUser } = await authRepo.registerTenantAdmin({
    tenantName: input.tenantName,
    email: input.email,
    passwordHash,
    language: input.language,
  });

  const token = signToken(toJwtPayload(fullUser));
  const user = toPublicUser(fullUser);

  await logEvent({
    tenantId: tenant.id,
    userId: fullUser.id,
    eventType: 'tenant_created',
    entityType: 'tenant',
    entityId: tenant.id,
    context: { tenantName: tenant.name },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  });
  await logEvent({
    tenantId: tenant.id,
    userId: fullUser.id,
    eventType: 'user_registered',
    entityType: 'user',
    entityId: fullUser.id,
    context: { role: fullUser.role, email: fullUser.email },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  });

  return { token, user };
}

export async function login(body: unknown, meta?: RequestMeta): Promise<AuthResponse> {
  const input = loginSchema.parse(body);

  const user = await authRepo.findUserByEmail(input.email);
  if (!user || !user.is_active) {
    await logEvent({
      tenantId: user?.tenant_id ?? null,
      userId: user?.id ?? null,
      eventType: 'login_failed',
      entityType: 'user',
      entityId: user?.id ?? null,
      context: { reason: 'invalid_credentials', email: input.email.toLowerCase() },
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
    });
    throw unauthorized('errors.invalidCredentials');
  }

  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) {
    await logEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      eventType: 'login_failed',
      entityType: 'user',
      entityId: user.id,
      context: { reason: 'invalid_credentials' },
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
    });
    throw unauthorized('errors.invalidCredentials');
  }

  const tenant = await authRepo.getTenantStatus(user.tenant_id);
  if (!tenant) {
    throw unauthorized('errors.tenantInvalid');
  }
  if (tenant.status === 'SUSPENDED' && user.role !== 'SUPER_ADMIN') {
    throw unauthorized('errors.tenantSuspended');
  }

  const publicUser = toPublicUser(user);
  const token = signToken(toJwtPayload(user));
  await logEvent({
    tenantId: user.tenant_id,
    userId: user.id,
    eventType: 'login_success',
    entityType: 'user',
    entityId: user.id,
    context: { role: user.role },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  });
  return { token, user: publicUser };
}

export async function forgotPassword(body: unknown): Promise<{ ok: true }> {
  const input = forgotPasswordSchema.parse(body);
  const user = await authRepo.findUserByEmail(input.email);

  if (user?.is_active) {
    const resetToken = await passwordResetRepo.createPasswordResetToken(user.id);
    const resetUrl = `${env.appUrl}/reset-password?token=${resetToken.token}`;
    void sendPasswordResetEmail({ to: user.email, resetUrl }).catch((err) =>
      console.error('[mail] sendPasswordResetEmail failed', err),
    );
  }

  return { ok: true };
}

export async function resetPassword(body: unknown): Promise<{ ok: true }> {
  const input = resetPasswordSchema.parse(body);
  const resetToken = await passwordResetRepo.findValidPasswordResetToken(input.token);

  if (!resetToken) {
    throw notFound('errors.resetTokenInvalid');
  }

  const user = await authRepo.findActiveUserById(resetToken.user_id);
  if (!user) {
    throw badRequest('errors.userDeactivated');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  await authRepo.updatePassword(user.id, passwordHash);
  await passwordResetRepo.markPasswordResetTokenUsed(resetToken.id);

  return { ok: true };
}

export async function getInvitationPreview(token: string) {
  const preview = await invitationsRepo.getInvitationPreview(token);
  if (!preview) {
    throw notFound('errors.invitationInvalid');
  }
  return {
    email: preview.email,
    role: preview.role,
    tenantName: preview.tenant_name,
    expiresAt: preview.expires_at.toISOString(),
  };
}

export async function acceptInvitation(body: unknown): Promise<AuthResponse> {
  const input = acceptInvitationSchema.parse(body);
  const invitation = await invitationsRepo.findInvitationByToken(input.token);

  if (!invitation || invitation.accepted_at) {
    throw notFound('errors.invitationInvalid');
  }
  if (invitation.expires_at < new Date()) {
    throw badRequest('errors.invitationExpired');
  }

  const existing = await authRepo.findUserByEmail(invitation.email);
  if (existing) {
    throw conflict('errors.emailExists');
  }

  const tenant = await authRepo.getTenantStatus(invitation.tenant_id);
  if (!tenant || tenant.status === 'SUSPENDED') {
    throw badRequest('errors.tenantSuspended');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await authRepo.createUser({
    email: invitation.email,
    passwordHash,
    tenantId: invitation.tenant_id,
    role: invitation.role,
    language: input.language,
  });

  await invitationsRepo.markInvitationAccepted(invitation.id);

  const fullUser = await authRepo.findUserByEmail(invitation.email);
  const token = signToken(toJwtPayload(fullUser!));
  return { token, user };
}

export async function getMe(context: RequestContext): Promise<UserPublic> {
  const user = await authRepo.findUserByIdAndTenant(context.userId, context.tenantId);
  if (!user) {
    throw unauthorized('errors.tenantMismatch');
  }
  return user;
}

export function parseLanguage(value: unknown): Language {
  const parsed = languageSchema.safeParse(value);
  if (!parsed.success) {
    throw badRequest('errors.invalidLanguage');
  }
  return parsed.data;
}

export { roleSchema, languageSchema };
