/**
 * Client-side helpers for talking to our API routes.
 *
 * The API envelope is { success: true, data } or { success: false, error, errorId? }.
 * `extractApiError` reads an error JSON body and returns the human message
 * augmented with the short errorId so users can quote it in support.
 */

type ApiErrorJson = {
  success?: boolean;
  error?: string;
  errorId?: string;
  message?: string;
};

/**
 * Pull a user-facing error message out of an API response JSON body.
 *
 * Falls back to `fallback` if the body has no recognisable error field.
 * When the server provided an `errorId` (i.e. unknown 500), it is appended
 * in parentheses so the user can quote it back to support.
 */
export function extractApiError(
  body: unknown,
  fallback = 'Something went wrong',
): string {
  if (body && typeof body === 'object') {
    const json = body as ApiErrorJson;
    const message = json.error ?? json.message ?? fallback;
    if (json.errorId) {
      return `${message} (ref ${json.errorId})`;
    }
    return message;
  }
  return fallback;
}
