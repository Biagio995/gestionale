import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { activeTenantMiddleware } from '../../middleware/activeTenantMiddleware.js';
import { clientTenantMiddleware } from '../../middleware/clientTenantMiddleware.js';
import { roleMiddleware } from '../../middleware/roleMiddleware.js';
import { tenantMiddleware } from '../../middleware/tenantMiddleware.js';
import * as usersController from './users.controller.js';

const router = Router();

router.patch(
  '/me/language',
  authMiddleware,
  tenantMiddleware,
  activeTenantMiddleware,
  usersController.updateLanguage,
);

router.get(
  '/me/onboarding',
  authMiddleware,
  tenantMiddleware,
  activeTenantMiddleware,
  clientTenantMiddleware,
  usersController.getOnboarding,
);

router.post(
  '/me/onboarding/dismiss',
  authMiddleware,
  tenantMiddleware,
  activeTenantMiddleware,
  clientTenantMiddleware,
  usersController.dismissOnboarding,
);

router.use(authMiddleware, tenantMiddleware, activeTenantMiddleware);

router.get(
  '/',
  roleMiddleware('ADMIN', 'SUPER_ADMIN'),
  usersController.list,
);

router.get(
  '/invitations',
  roleMiddleware('ADMIN', 'SUPER_ADMIN'),
  usersController.listPendingInvitations,
);

router.delete(
  '/invitations/:id',
  roleMiddleware('ADMIN', 'SUPER_ADMIN'),
  usersController.cancelInvitation,
);

router.post(
  '/invite',
  roleMiddleware('ADMIN', 'SUPER_ADMIN'),
  usersController.invite,
);

router.delete(
  '/:id',
  roleMiddleware('ADMIN', 'SUPER_ADMIN'),
  usersController.deactivate,
);

router.patch(
  '/:id/role',
  roleMiddleware('ADMIN', 'SUPER_ADMIN'),
  usersController.updateRole,
);

export default router;
