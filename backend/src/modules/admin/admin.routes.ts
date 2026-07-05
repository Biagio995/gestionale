import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { superAdminMiddleware } from '../../middleware/superAdminMiddleware.js';
import * as adminController from './admin.controller.js';
import * as ticketsController from '../tickets/tickets.controller.js';

const router = Router();

router.use(authMiddleware, superAdminMiddleware);

router.get('/stats', adminController.dashboardStats);
router.get('/companies', adminController.listCompanies);
router.post('/companies', adminController.createCompany);
router.patch('/companies/:id/status', adminController.updateCompanyStatus);
router.patch('/companies/:id', adminController.updateCompany);
router.get('/contracts', adminController.listContracts);
router.post('/contracts', adminController.createContract);
router.get('/contracts/:id', adminController.getContract);
router.patch('/contracts/:id', adminController.updateContract);
router.post('/contracts/:id/renew', adminController.renewContract);
router.delete('/contracts/:id', adminController.deleteContract);

router.get('/tickets', ticketsController.listAll);
router.get('/tickets/unread-count', ticketsController.unreadCount);
router.get('/tickets/:id', ticketsController.getAdmin);
router.post('/tickets/:id/messages', ticketsController.addMessageAdmin);
router.patch('/tickets/:id/status', ticketsController.updateStatusAdmin);
router.patch('/tickets/:id/assign', ticketsController.assignAdmin);

export default router;
