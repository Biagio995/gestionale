import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { activeTenantMiddleware } from '../../middleware/activeTenantMiddleware.js';
import { clientTenantMiddleware } from '../../middleware/clientTenantMiddleware.js';
import { tenantMiddleware } from '../../middleware/tenantMiddleware.js';
import * as crmController from './crm.controller.js';

const router = Router();

router.use(authMiddleware, tenantMiddleware, activeTenantMiddleware, clientTenantMiddleware);

router.get('/stats', crmController.stats);

router.get('/contacts', crmController.listContacts);
router.post('/contacts', crmController.createContact);
router.get('/contacts/:id', crmController.getContact);
router.put('/contacts/:id', crmController.updateContact);
router.delete('/contacts/:id', crmController.deleteContact);

router.get('/deals', crmController.listDeals);
router.post('/deals', crmController.createDeal);
router.put('/deals/:id', crmController.updateDeal);
router.delete('/deals/:id', crmController.deleteDeal);

router.post('/activities', crmController.createActivity);

export default router;
