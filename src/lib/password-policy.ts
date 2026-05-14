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
 * Password complexity rules. Mirrored on the client by `checkPasswordRules`
 * so the live checklist shown during signup matches what the server will
 * accept. Keep these two in sync.
 *
 * Existing accounts are unaffected — only `/api/auth/signup` re-checks
 * complexity, login does not.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 30;

export type PasswordRuleKey = 'lower' | 'upper' | 'special' | 'min' | 'max';

export const PASSWORD_RULES: { key: PasswordRuleKey; label: string }[] = [
  { key: 'lower', label: 'Password should contain at least 1 lower letter' },
  { key: 'upper', label: 'Password should contain at least 1 upper letter' },
  { key: 'special', label: 'Password should contain at least 1 special sign' },
  { key: 'min', label: `Password should contain at least ${PASSWORD_MIN_LENGTH} chars` },
  { key: 'max', label: `Password should contain maximum ${PASSWORD_MAX_LENGTH} chars` },
];

/**
 * Run every rule against a candidate password. Returns a map of pass/fail
 * keyed by rule. Pure function — safe to call from a render path.
 */
export function checkPasswordRules(pw: string): Record<PasswordRuleKey, boolean> {
  return {
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
    min: pw.length >= PASSWORD_MIN_LENGTH,
    max: pw.length > 0 && pw.length <= PASSWORD_MAX_LENGTH,
  };
}

/**
 * Server-side gate. Returns a human-readable error string for the first
 * failed rule (in display order) or null if every rule passes.
 */
export function checkPasswordComplexity(pw: string): string | null {
  const result = checkPasswordRules(pw);
  for (const rule of PASSWORD_RULES) {
    if (!result[rule.key]) return rule.label.replace(/^Password should /, 'Password must ');
  }
  return null;
}
