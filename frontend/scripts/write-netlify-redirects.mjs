import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const apiBase = process.env.NETLIFY_API_PROXY_URL?.replace(/\/$/, '');
const outPath = join('dist', '_redirects');

const apiPrefixes = [
  '/auth',
  '/users',
  '/items',
  '/crm',
  '/sales',
  '/calendar',
  '/tickets',
  '/admin',
  '/health',
];

let content = '';

if (apiBase) {
  for (const prefix of apiPrefixes) {
    content += `${prefix}/*  ${apiBase}${prefix}/:splat  200\n`;
    content += `${prefix}  ${apiBase}${prefix}  200\n`;
  }
  console.log(`Netlify: proxy API → ${apiBase}`);
} else if (process.env.VITE_API_URL) {
  console.log(`Netlify: chiamate API dirette → ${process.env.VITE_API_URL}`);
} else {
  console.warn(
    'Netlify: NESSUN backend configurato. Imposta NETLIFY_API_PROXY_URL (consigliato) o VITE_API_URL.',
  );
}

content += '/*    /index.html   200\n';
writeFileSync(outPath, content);
