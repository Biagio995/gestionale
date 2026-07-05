import pg from 'pg';
import { env } from '../config/env.js';

function buildPoolConfig(): pg.PoolConfig {
  const raw = env.databaseUrl;
  const needsSsl =
    /sslmode=/i.test(raw) ||
    raw.includes('aivencloud.com');

  if (!needsSsl) {
    return { connectionString: raw };
  }

  // pg v8 tratta sslmode=require come verify-full: rimuoviamo i param SSL
  // dalla URL e usiamo rejectUnauthorized: false (certificati Aiven/cloud).
  const url = new URL(raw);
  for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat']) {
    url.searchParams.delete(key);
  }

  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
  };
}

export const pool = new pg.Pool(buildPoolConfig());
