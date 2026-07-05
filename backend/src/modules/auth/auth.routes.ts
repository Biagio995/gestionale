import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { activeTenantMiddleware } from '../../middleware/activeTenantMiddleware.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';
import { tenantMiddleware } from '../../middleware/tenantMiddleware.js';
import * as authController from './auth.controller.js';

const router = Router();

router.get('/invitations/:token', authController.invitationPreview);
router.post('/accept-invitation', authRateLimiter, authController.acceptInvitation);
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.post('/reset-password', authRateLimiter, authController.resetPassword);
router.get('/me', authMiddleware, tenantMiddleware, activeTenantMiddleware, authController.me);

export default router;
