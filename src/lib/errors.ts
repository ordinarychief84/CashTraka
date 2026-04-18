/**
 * Typed service errors. Services throw these; route handlers catch via
 * `handled()` in api-response.ts and map to HTTP status codes.
 */

type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'PAYMENT_REQUIRED';

export class ServiceError extends Error {
  code: ErrorCode;
  details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.details = details;
  }
}

export const Err = {
  unauthorized: (message = 'Unauthorized') => new ServiceError('UNAUTHORIZED', message),
  forbidden: (message = 'Forbidden') => new ServiceError('FORBIDDEN', message),
  notFound: (message = 'Not found') => new ServiceError('NOT_FOUND', message),
  conflict: (message: string) => new ServiceError('CONFLICT', message),
  validation: (message: string, details?: unknown) =>
    new ServiceError('VALIDATION', message, details),
  paymentRequired: (message: string, details?: unknown) =>
    new ServiceError('PAYMENT_REQUIRED', message, details),
};
