import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Consistent JSON response envelope for all API routes.
 *
 *   Success:  { success: true,  data: T }
 *   Failure:  { success: false, error: string, errorId?: string, details?: unknown }
 *
 * Use these helpers instead of raw NextResponse.json() in new code. Older
 * routes will be migrated opportunistically as they're touched.
 */

export type ApiOk<T> = { success: true; data: T };
export type ApiErr = {
  success: false;
  error: string;
  /** Short tracking ID for unknown 500s so users can quote it in support. */
  errorId?: string;
  details?: unknown;
};
export type ApiResponse<T> = ApiOk<T> | ApiErr;

/** Generate a short, human-quotable error ID (8 chars, hex). */
function shortErrorId(): string {
  const bytes = new Uint8Array(4);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 4; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Map a Prisma error code to a user-friendly message. Returns null if the
 * error isn't a known Prisma code so the caller can fall through to the
 * generic 500 path.
 *
 * We only handle the codes that meaningfully change UX:
 *   P2002 — unique constraint (duplicate) → 409 Conflict
 *   P2025 — record not found              → 404 Not found
 *   P2003 — foreign-key violation         → 409 Conflict
 *   P2014 — relation violation            → 409 Conflict
 */
function prismaErrorToResponse(e: any): NextResponse<ApiErr> | null {
  const code = e?.code;
  if (typeof code !== 'string' || !code.startsWith('P')) return null;
  switch (code) {
    case 'P2002': {
      const target = e?.meta?.target;
      const fieldList = Array.isArray(target) ? target.join(', ') : String(target ?? '');
      const msg = fieldList
        ? `That ${fieldList} is already in use.`
        : 'That value already exists.';
      return fail(msg, 409);
    }
    case 'P2025':
      return notFound('Record not found.');
    case 'P2003':
    case 'P2014':
      return fail('This record is referenced elsewhere — remove the related items first.', 409);
    default:
      return null;
  }
}

/** 200 (or custom 2xx) with a data payload. */
export function ok<T>(data: T, status = 200): NextResponse<ApiOk<T>> {
  return NextResponse.json<ApiOk<T>>({ success: true, data }, { status });
}

/** 4xx/5xx with a human-readable error. */
export function fail(
  error: string,
  status = 400,
  details?: unknown,
  errorId?: string,
): NextResponse<ApiErr> {
  const body: ApiErr = { success: false, error };
  if (errorId) body.errorId = errorId;
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

/**
 * Translate a thrown ServiceError from `requireAuth`/`requirePermission`
 * into a legacy `{ error }` envelope response. Handlers that pre-date the
 * `handled()` wrapper use this inside a try/catch. Returns `null` if the
 * exception isn't an auth-related ServiceError so the caller can rethrow.
 */
export function authFail(e: unknown): NextResponse | null {
  const err = e as { code?: string; message?: string };
  if (err?.code === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (err?.code === 'FORBIDDEN') {
    return NextResponse.json({ error: err.message ?? 'Forbidden' }, { status: 403 });
  }
  return null;
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
 *
 * Error translation order:
 *   1. ZodError                                 → 422 + first issue message
 *   2. ServiceError-style { code: UPPERCASE }   → mapped 4xx with message
 *   3. PrismaClientKnownRequestError (P-codes)  → 404/409 with friendly text
 *   4. Anything else                            → 500 + tracked errorId
 *
 * The 500 path always logs (in dev AND prod) and emits a short errorId so
 * users can quote it in support.
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

    // Prisma error translation — give the user something useful instead
    // of an opaque 500.
    const prismaResp = prismaErrorToResponse(e);
    if (prismaResp) return prismaResp;

    // Unknown error: log with an ID we hand back to the user.
    const errorId = shortErrorId();
    // Log everywhere — including prod — so we can debug from server logs.
    // We deliberately don't include sensitive details in the response body.
    console.error(`[api-error ${errorId}]`, e);
    return fail(
      'Something went wrong. Please try again.',
      500,
      undefined,
      errorId,
    );
  }
}
