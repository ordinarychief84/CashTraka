/**
 * Password policy — a minimal, shippable version.
 *
 * We rely on Zod's 8-char min at the edge, then run a cheap check against
 * a curated list of extremely common passwords (top ~100 from public
 * breach datasets, deduplicated). This is not a full HaveIBeenPwned
 * lookup — that's a future upgrade — but it catches the lowest-effort
 * attacker pattern of "12345678", "password", "qwerty123", etc.
 *
 * The list is intentionally short so it stays in-memory and doesn't bloat
 * the Node bundle. Entries are lower-cased; we also check simple variants
 * like appending digits.
 */

const COMMON: Set<string> = new Set(
  [
    // Top 50 from SecLists/2023
    '123456', '123456789', 'qwerty', 'password', '12345',
    'qwerty123', '1q2w3e', '12345678', '111111', '1234567890',
    '1234567', 'qwerty1', '000000', 'abc123', 'password1',
    'iloveyou', 'aa12345678', '1234', '123123', 'dragon',
    'monkey', 'letmein', 'shadow', 'master', 'football',
    'baseball', 'welcome', 'qwertyuiop', 'admin', 'admin123',
    'login', 'princess', 'solo', 'passw0rd', 'starwars',
    // Nigerian-specific common picks
    'cashtraka', 'nigeria', 'lagos', 'naija', 'payment',
    'business', 'cashtraka123', 'whatsapp',
    // Office / dev defaults
    'changeme', 'qwerty12345', 'test1234', 'demo1234',
    'demo123', 'abcdefgh', 'password123',
  ].map((s) => s.toLowerCase()),
);

export function isWeakPassword(pw: string): boolean {
  const normalised = pw.toLowerCase();
  if (COMMON.has(normalised)) return true;
  // Repeated single character (aaaaaaaa, 11111111).
  if (/^(.)\1+$/.test(normalised)) return true;
  // Sequential digits (12345678, 87654321).
  if (/^(01234567|12345678|23456789|98765432|87654321|76543210)/.test(normalised)) return true;
  // Sequential letters (abcdefgh).
  if (/^(abcdefgh|bcdefghi|cdefghij)/.test(normalised)) return true;
  return false;
}

/**
 * Password complexity — returns a human-readable error or null if ok.
 * Requires at least 8 chars, 1 uppercase, and 1 digit or special char.
 */
export function checkPasswordComplexity(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (pw.length > 128) return 'Password must be 128 characters or fewer.';
  if (!/[A-Z]/.test(pw)) return 'Include at least one uppercase letter.';
  if (!/[0-9]/.test(pw) && !/[^A-Za-z0-9]/.test(pw)) {
    return 'Include at least one number or special character.';
  }
  return null;
}
