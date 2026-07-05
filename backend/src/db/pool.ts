import pg from 'pg';
import { env } from '../config/env.js';

const connectionString = env.databaseUrl;
const needsSsl =
  /sslmode=require/i.test(connectionString) ||
  connectionString.includes('aivencloud.com');

export const pool = new pg.Pool({
  connectionString,
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});
