import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { activeTenantMiddleware } from '../../middleware/activeTenantMiddleware.js';
import { clientTenantMiddleware } from '../../middleware/clientTenantMiddleware.js';
import { roleMiddleware } from '../../middleware/roleMiddleware.js';
import { tenantMiddleware } from '../../middleware/tenantMiddleware.js';
import * as itemsController from './items.controller.js';

const router = Router();

router.use(authMiddleware, tenantMiddleware, activeTenantMiddleware);

const adminOnly = roleMiddleware('ADMIN', 'SUPER_ADMIN');

router.get('/', itemsController.list);
router.get('/:id', itemsController.getById);
router.post('/', adminOnly, itemsController.create);
router.put('/:id', adminOnly, itemsController.update);
router.delete('/:id', adminOnly, itemsController.remove);

export default router;
