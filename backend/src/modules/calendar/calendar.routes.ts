import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { activeTenantMiddleware } from '../../middleware/activeTenantMiddleware.js';
import { tenantMiddleware } from '../../middleware/tenantMiddleware.js';
import * as calendarController from './calendar.controller.js';

const router = Router();

router.use(authMiddleware, tenantMiddleware, activeTenantMiddleware);

router.get('/events', calendarController.list);
router.post('/events', calendarController.create);
router.get('/events/:id', calendarController.get);
router.put('/events/:id', calendarController.update);
router.delete('/events/:id', calendarController.remove);

export default router;
