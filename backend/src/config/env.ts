import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  mailEnabled: process.env.MAIL_ENABLED === 'true',
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'noreply@gestionale.local',
  },
  platformNotifyEmail: process.env.PLATFORM_NOTIFY_EMAIL ?? 'admin@gestionale.local',
  sdiMode: process.env.SDI_MODE === 'production' ? 'production' : 'simulated',
  fiscalViesEnabled: process.env.FISCAL_VIES_ENABLED === 'true',
} as const;
