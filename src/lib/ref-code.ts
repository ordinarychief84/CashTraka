// Short, human-friendly reference code generator. No 0/O/1/I to avoid confusion
// when the customer types it into a bank narration.

import { randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Cryptographically-secure short reference code for bank narrations.
 * Uses crypto.randomBytes — `Math.random()` was previously used here,
 * which is predictable. An attacker who observes a few codes could
 * guess future ones and forge payment narrations that collide with
 * a real customer's incoming transfer.
 *
 * The alphabet is 32 characters; we mask the low 5 bits of each byte
 * for a perfectly uniform draw with no rejection sampling.
 */
export function generateRefCode(): string {
  let out = 'CT-';
  const bytes = randomBytes(5);
  for (let i = 0; i < 5; i++) {
    out += ALPHABET[bytes[i] & 0x1f];
  }
  return out;
}

/** Normalize text for comparing against a reference code (strip spaces, punctuation, casing). */
export function normalizeForCompare(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Returns true if `text` contains the `code` (ignoring casing, punctuation, spaces). */
export function textContainsCode(text: string, code: string): boolean {
  return normalizeForCompare(text).includes(normalizeForCompare(code));
}
