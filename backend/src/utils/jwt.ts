import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { JwtPayload } from '../types/index.js';

export function signToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (typeof decoded === 'string' || !decoded) {
    throw new Error('Invalid token payload');
  }
  return decoded as JwtPayload;
}
