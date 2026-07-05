import { createApp } from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';

async function start(): Promise<void> {
  console.log('Running database migrations...');
  await runMigrations();
  console.log('Migrations done, starting HTTP server...');

  const app = createApp();

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Server listening on 0.0.0.0:${env.port}`);
  });
}

start().catch((err: unknown) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
