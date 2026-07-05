import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import calendarRoutes from './modules/calendar/calendar.routes.js';
import crmRoutes from './modules/crm/crm.routes.js';
import itemsRoutes from './modules/items/items.routes.js';
import salesRoutes from './modules/sales/sales.routes.js';
import ticketsRoutes from './modules/tickets/tickets.routes.js';
import usersRoutes from './modules/users/users.routes.js';

export function createApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'gestionale-api' });
  });

  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', db: 'connected' });
    } catch {
      // 200 anche se il DB non risponde: Belmo usa /health come liveness probe.
      res.json({ status: 'degraded', db: 'disconnected' });
    }
  });

  app.use('/auth', authRoutes);
  app.use('/users', usersRoutes);
  app.use('/items', itemsRoutes);
  app.use('/crm', crmRoutes);
  app.use('/sales', salesRoutes);
  app.use('/calendar', calendarRoutes);
  app.use('/tickets', ticketsRoutes);
  app.use('/admin', adminRoutes);

  app.use(errorHandler);

  return app;
}
