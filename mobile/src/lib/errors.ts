/**
 * Mirror of the web `ServiceError` shape so the mobile app can map
 * server-side typed errors back into human messages on the UI.
 */

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'PAYMENT_REQUIRED'
  | 'NETWORK'
  | 'UNKNOWN';

export class AppError extends Error {
  code: ErrorCode;
  status?: number;
  details?: unknown;
  constructor(code: ErrorCode, message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Translate a network-layer error envelope into an AppError. The web
 * uses `{ success: false, error, details? }`; we map both this and
 * raw HTTP status codes into one type.
 */
export function appErrorFromResponse(status: number, body: unknown): AppError {
  const error =
    body && typeof body === 'object' && 'error' in body
      ? String((body as { error: unknown }).error ?? 'Something went wrong')
      : 'Something went wrong';
  const details =
    body && typeof body === 'object' && 'details' in body
      ? (body as { details: unknown }).details
      : undefined;
  switch (status) {
    case 401:
      return new AppError('UNAUTHORIZED', 'Please sign in again', 401, details);
    case 402:
      return new AppError('PAYMENT_REQUIRED', error, 402, details);
    case 403:
      return new AppError('FORBIDDEN', error, 403, details);
    case 404:
      return new AppError('NOT_FOUND', error, 404, details);
    case 409:
      return new AppError('CONFLICT', error, 409, details);
    case 422:
      return new AppError('VALIDATION', error, 422, details);
    default:
      return new AppError('UNKNOWN', error, status, details);
  }
}

/**
 * Short, user-facing message picker. Use this in toasts/alerts.
 * Never show `err.message` straight from the network — it might be
 * "fetch failed" gibberish.
 */
export function userMessage(err: unknown): string {
  if (err instanceof AppError) {
    if (err.code === 'NETWORK') return "Can't reach CashTraka. Check your connection.";
    if (err.code === 'UNAUTHORIZED') return 'Your session expired. Please sign in.';
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}
