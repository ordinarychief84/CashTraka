// Short, human-friendly reference code generator. No 0/O/1/I to avoid confusion
// when the customer types it into a bank narration.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRefCode(): string {
  let out = 'CT-';
  for (let i = 0; i < 5; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
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
