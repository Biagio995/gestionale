import { createApp } from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';

async function start(): Promise<void> {
  const app = createApp();

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Server listening on 0.0.0.0:${env.port}`);
  });

  console.log('Running database migrations...');
  await runMigrations();
  console.log('Migrations completed.');
}

start().catch((err: unknown) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
