import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { activeTenantMiddleware } from '../../middleware/activeTenantMiddleware.js';
import { clientTenantMiddleware } from '../../middleware/clientTenantMiddleware.js';
import { tenantMiddleware } from '../../middleware/tenantMiddleware.js';
import * as ticketsController from './tickets.controller.js';

const router = Router();

router.use(authMiddleware, tenantMiddleware, activeTenantMiddleware, clientTenantMiddleware);

router.get('/stats', ticketsController.tenantStats);
router.get('/', ticketsController.list);
router.post('/', ticketsController.create);
router.get('/:id', ticketsController.get);
router.post('/:id/messages', ticketsController.addMessage);
router.patch('/:id/status', ticketsController.updateStatus);

export default router;
