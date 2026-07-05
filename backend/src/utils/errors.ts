import type { ApiErrorBody } from '../types/index.js';

export class AppError extends Error {
  readonly statusCode: number;
  readonly body: ApiErrorBody;

  constructor(statusCode: number, code: string, messageKey: string, context?: Record<string, unknown>) {
    super(messageKey);
    this.statusCode = statusCode;
    this.body = { code, messageKey, context };
  }
}

export function notFound(messageKey = 'errors.notFound'): AppError {
  return new AppError(404, 'NOT_FOUND', messageKey);
}

export function unauthorized(messageKey = 'errors.unauthorized'): AppError {
  return new AppError(401, 'UNAUTHORIZED', messageKey);
}

export function forbidden(messageKey = 'errors.forbidden'): AppError {
  return new AppError(403, 'FORBIDDEN', messageKey);
}

export function badRequest(messageKey: string, context?: Record<string, unknown>): AppError {
  return new AppError(400, 'BAD_REQUEST', messageKey, context);
}

export function conflict(messageKey: string, context?: Record<string, unknown>): AppError {
  return new AppError(409, 'CONFLICT', messageKey, context);
}
