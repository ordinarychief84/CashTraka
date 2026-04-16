import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Consistent JSON response envelope for all API routes.
 *
 *   Success:  { success: true,  data: T }
 *   Failure:  { success: false, error: string, details?: unknown }
 *
 * Use these helpers instead of raw NextResponse.json() in new code. Older
 * routes will be migrated opportunistically as they're touched.
 */

export type ApiOk<T> = { success: true; data: T };
export type ApiErr = { success: false; error: string; details?: unknown };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

/** 200 (or custom 2xx) with a data payload. */
export function ok<T>(data: T, status = 200): NextResponse<ApiOk<T>> {
  return NextResponse.json<ApiOk<T>>({ success: true, data }, { status });
}

/** 4xx/5xx with a human-readable error. */
export function fail(
  error: string,
  status = 400,
  details?: unknown,
): NextResponse<ApiErr> {
  const body: ApiErr = { success: false, error };
  if (details !== undefined) body.details = details;
  return NextResponse.json<ApiErr>(body, { status });
}

/** Common 401 shortcut. */
export function unauthorized(error = 'Unauthorized'): NextResponse<ApiErr> {
  return fail(error, 401);
}

/** Common 403 shortcut. */
export function forbidden(error = 'Forbidden'): NextResponse<ApiErr> {
  return fail(error, 403);
}

/** Common 404 shortcut. */
export function notFound(error = 'Not found'): NextResponse<ApiErr> {
  return fail(error, 404);
}

/** 422 for Zod validation failures — returns the first issue + full details. */
export function validationFail(err: ZodError): NextResponse<ApiErr> {
  const first = err.issues[0];
  const msg = first ? first.message : 'Invalid input';
  return fail(msg, 422, { issues: err.issues });
}

/**
 * Wrap a handler so thrown ServiceError / ZodError turn into structured
 * responses. The callback's return type is intentionally loose: any
 * NextResponse (success envelope, failure envelope, or raw) is acceptable.
 */
export async function handled(
  fn: () => Promise<NextResponse<any>>,
): Promise<NextResponse<any>> {
  try {
    return await fn();
  } catch (e: any) {
    if (e instanceof ZodError) return validationFail(e);
    if (e?.code === 'UNAUTHORIZED') return unauthorized();
    if (e?.code === 'FORBIDDEN') return forbidden(e.message);
    if (e?.code === 'NOT_FOUND') return notFound(e.message);
    if (e?.code === 'CONFLICT') return fail(e.message ?? 'Conflict', 409);
    if (e?.code === 'VALIDATION') return fail(e.message ?? 'Invalid input', 422);
    if (e?.code === 'PAYMENT_REQUIRED') return fail(e.message ?? 'Upgrade required', 402);
    // Unknown errors: don't leak internals.
    if (process.env.NODE_ENV !== 'production') console.error(e);
    return fail('Something went wrong', 500);
  }
}
