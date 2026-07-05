import { z } from 'zod';
import type { OnboardingStatus, RequestContext, Role, UserPublic } from '../../types/index.js';
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors.js';
import { isPlatformTenant } from '../../config/platform.js';
import { env } from '../../config/env.js';
import { sendInvitationEmail } from '../../services/mail.service.js';
import { logEvent } from '../audit/audit.service.js';
import { findUserByEmail } from '../auth/auth.repository.js';
import { languageSchema } from '../auth/auth.service.js';
import { countItemsByTenant } from '../items/items.repository.js';
import * as invitationsRepo from './invitations.repository.js';
import * as usersRepo from './users.repository.js';

const updateLanguageSchema = z.object({
  language: languageSchema,
});

const tenantRoleSchema = z.enum(['ADMIN', 'USER']);
const platformRoleSchema = z.literal('SUPER_ADMIN');

const clientInviteSchema = z.object({
  email: z.string().email(),
  role: tenantRoleSchema.optional().default('USER'),
});

const platformInviteSchema = z.object({
  email: z.string().email(),
  role: platformRoleSchema.optional().default('SUPER_ADMIN'),
});

const updateRoleSchema = z.object({
  role: tenantRoleSchema,
});

export interface InviteResult {
  email: string;
  role: Role;
  inviteUrl: string;
  expiresAt: string;
}

function assertAdmin(context: RequestContext): void {
  if (context.role !== 'ADMIN' && context.role !== 'SUPER_ADMIN') {
    throw forbidden('errors.insufficientRole');
  }
}

function assertCanManageTeam(context: RequestContext): void {
  if (isPlatformTenant(context.tenantId)) {
    if (context.role !== 'SUPER_ADMIN') {
      throw forbidden('errors.insufficientRole');
    }
    return;
  }
  assertAdmin(context);
}

export async function updateLanguage(
  context: RequestContext,
  body: unknown,
): Promise<UserPublic> {
  const input = updateLanguageSchema.parse(body);
  const user = await usersRepo.updateUserLanguage(
    context.userId,
    context.tenantId,
    input.language,
  );
  if (!user) {
    throw notFound('errors.userNotFound');
  }
  await usersRepo.markLanguageConfigured(context.userId, context.tenantId);
  return user;
}

export async function listUsers(context: RequestContext): Promise<UserPublic[]> {
  assertCanManageTeam(context);
  return usersRepo.findUsersByTenant(context.tenantId);
}

export async function listPendingInvitations(
  context: RequestContext,
): Promise<invitationsRepo.PendingInvitationPublic[]> {
  assertCanManageTeam(context);
  return invitationsRepo.findPendingInvitationsByTenant(context.tenantId);
}

export async function cancelInvitation(
  context: RequestContext,
  invitationId: string,
): Promise<void> {
  assertCanManageTeam(context);
  const deleted = await invitationsRepo.deletePendingInvitation(
    invitationId,
    context.tenantId,
  );
  if (!deleted) {
    throw notFound('errors.invitationNotFound');
  }
}

export async function inviteUser(
  context: RequestContext,
  body: unknown,
): Promise<InviteResult> {
  assertCanManageTeam(context);

  const onPlatform = isPlatformTenant(context.tenantId);
  const input = (onPlatform ? platformInviteSchema : clientInviteSchema).parse(body);
  const role = input.role as Role;

  if (role === 'SUPER_ADMIN' && !onPlatform) {
    throw forbidden('errors.insufficientRole');
  }

  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw conflict('errors.emailExists');
  }

  const pending = await invitationsRepo.findPendingInvitationByEmail(
    context.tenantId,
    input.email,
  );
  if (pending) {
    throw conflict('errors.invitationPending');
  }

  const invitation = await invitationsRepo.createInvitation({
    tenantId: context.tenantId,
    email: input.email,
    role: input.role as Role,
    invitedBy: context.userId,
  });

  const inviteUrl = `${env.appUrl}/accept-invite?token=${invitation.token}`;

  const tenant = await usersRepo.getTenantName(context.tenantId);
  await sendInvitationEmail({
    to: input.email,
    tenantName: onPlatform ? 'Gestionale' : (tenant ?? 'Gestionale'),
    inviteUrl,
  });

  return {
    email: invitation.email,
    role: invitation.role,
    inviteUrl,
    expiresAt: invitation.expires_at.toISOString(),
  };
}

export async function updateRole(
  context: RequestContext,
  targetUserId: string,
  body: unknown,
): Promise<UserPublic> {
  if (isPlatformTenant(context.tenantId)) {
    throw forbidden('errors.cannotModifyPlatformTeam');
  }

  assertAdmin(context);
  const input = updateRoleSchema.parse(body);

  if (targetUserId === context.userId) {
    throw badRequest('errors.cannotChangeOwnRole');
  }

  const target = await usersRepo.findUserByIdAndTenant(targetUserId, context.tenantId);
  if (!target) {
    throw notFound('errors.userNotFound');
  }

  if (target.role === 'SUPER_ADMIN') {
    throw forbidden('errors.cannotModifySuperAdmin');
  }

  if (target.role === 'ADMIN' && input.role === 'USER') {
    const activeAdmins = await usersRepo.countActiveUsersByRole(context.tenantId, 'ADMIN');
    if (activeAdmins <= 1) {
      throw badRequest('errors.cannotDemoteLastAdmin');
    }
  }

  const updated = await usersRepo.updateUserRole(
    targetUserId,
    context.tenantId,
    input.role as Role,
  );
  if (!updated) {
    throw notFound('errors.userNotFound');
  }
  await logEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    eventType: 'role_changed',
    entityType: 'user',
    entityId: targetUserId,
    context: { fromRole: target.role, toRole: updated.role },
  });
  return updated;
}

export async function getOnboardingStatus(context: RequestContext): Promise<OnboardingStatus> {
  if (isPlatformTenant(context.tenantId)) {
    return {
      steps: {
        createFirstItem: true,
        inviteColleague: true,
        setLanguage: true,
      },
      completed: true,
      dismissed: true,
    };
  }

  const [state, itemCount, userCount, pendingInvites] = await Promise.all([
    usersRepo.getUserOnboardingState(context.userId, context.tenantId),
    countItemsByTenant(context.tenantId),
    usersRepo.countActiveUsers(context.tenantId),
    invitationsRepo.countPendingInvitationsByTenant(context.tenantId),
  ]);

  const steps = {
    createFirstItem: itemCount > 0,
    inviteColleague: userCount > 1 || pendingInvites > 0,
    setLanguage: state.languageConfigured,
  };

  return {
    steps,
    completed: steps.createFirstItem && steps.inviteColleague && steps.setLanguage,
    dismissed: state.dismissed,
  };
}

export async function dismissOnboarding(context: RequestContext): Promise<OnboardingStatus> {
  await usersRepo.dismissOnboarding(context.userId, context.tenantId);
  return getOnboardingStatus(context);
}

export async function deactivateUser(
  context: RequestContext,
  targetUserId: string,
): Promise<void> {
  assertCanManageTeam(context);

  if (targetUserId === context.userId) {
    throw badRequest('errors.cannotDeactivateSelf');
  }

  const target = await usersRepo.findUserByIdAndTenant(targetUserId, context.tenantId);
  if (!target) {
    throw notFound('errors.userNotFound');
  }

  const onPlatform = isPlatformTenant(context.tenantId);
  if (onPlatform && target.role === 'SUPER_ADMIN') {
    const activeSuperAdmins = await usersRepo.countActiveUsersByRole(
      context.tenantId,
      'SUPER_ADMIN',
    );
    if (activeSuperAdmins <= 1) {
      throw badRequest('errors.cannotDeactivateLastSuperAdmin');
    }
  }

  const deactivated = await usersRepo.deactivateUser(targetUserId, context.tenantId);
  if (!deactivated) {
    throw notFound('errors.userNotFound');
  }
}
