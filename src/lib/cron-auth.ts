/**
 * Shared helper for the `Authorization: Bearer <CRON_SECRET>` check used
 * by every cron route. Uses `crypto.timingSafeEqual` for constant-time
 * comparison so a malicious caller can't time-side-channel the secret.
 *
 * Returns `true` when the header is present and matches, `false` otherwise.
 * `false` should be turned into a 401 by the caller.
 */
import { timingSafeEqual } from 'node:crypto';

export function isAuthorizedCronRequest(authHeader: string | null): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !authHeader) return false;
  const expected = `Bearer ${cronSecret}`;
  // timingSafeEqual throws on length mismatch — guard first.
  if (authHeader.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}
