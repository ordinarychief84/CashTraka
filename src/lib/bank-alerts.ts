/**
 * Parses a pasted Nigerian bank credit alert (SMS or email) into a structured object.
 *
 * Design: we deliberately accept a wide variety of templates. Sellers receive alerts
 * from GTBank, Access, First Bank, Zenith, UBA, Fidelity, Kuda, Opay, Palmpay, and
 * Moniepoint — each with slightly different wording. Rather than trying to maintain
 * one regex per bank, we extract fields heuristically:
 *   • amount: first occurrence of "NGN <digits>" or "₦<digits>"
 *   • bank: matched against a known list if any brand name appears
 *   • sender name: string following "from" (capitalized word run) or between known keywords
 *   • ref/narration: string following "Ref:", "Narration:", "Description:", "Remark:"
 *
 * Returns null if we can't find an amount — anything else is a best-effort extraction.
 */

export type ParsedAlert = {
  amount: number;
  sender?: string;
  ref?: string;
  bank?: string;
  currency: 'NGN';
};

const BANKS = [
  'GTBank', 'GTB', 'Access', 'First Bank', 'Firstbank', 'Zenith', 'UBA',
  'Fidelity', 'FCMB', 'Stanbic', 'Ecobank', 'Wema', 'Union', 'Keystone',
  'Sterling', 'Polaris', 'Providus', 'Kuda', 'Opay', 'OPay', 'Palmpay',
  'PalmPay', 'Moniepoint', 'Fairmoney', 'VFD', 'Carbon',
];

function matchBank(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const b of BANKS) {
    if (lower.includes(b.toLowerCase())) return b;
  }
  return undefined;
}

function parseAmount(text: string): number | null {
  // Try NGN / N / ₦ prefix with amount
  const patterns = [
    /(?:NGN|N|₦)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i,
    /([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:NGN|Naira)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const cleaned = m[1].replace(/,/g, '');
      const n = Math.round(parseFloat(cleaned));
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

function parseSender(text: string): string | undefined {
  // Common patterns for sender in Nigerian bank alerts.
  // Try each in order and return the first that looks reasonable.
  const patterns = [
    // "from JOHN DOE" or "from JOHN DOE /GTB/..." (Kuda-style)
    /\bfrom\s+([A-Z][A-Z'.\- ]{1,60}?)(?:\s{2,}|\s*\/|\s*via\b|\s*on\b|\s*\n|\s*\.|\s*$)/i,
    // "Sender: JOHN DOE"
    /Sender\s*[:\-]\s*([A-Z][A-Z'.\- ]{1,60})/i,
    // "by JOHN DOE"
    /\bby\s+([A-Z][A-Z'.\- ]{1,60}?)(?:\s{2,}|\s*\/|\s*via\b|\s*on\b|\s*\n|\s*\.|\s*$)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const cleaned = m[1].trim().replace(/\s+/g, ' ');
      if (cleaned.length >= 3 && cleaned.length <= 60) return cleaned;
    }
  }
  return undefined;
}

function parseRef(text: string): string | undefined {
  const patterns = [
    /(?:Narration|Narr|Description|Remark|Ref|Reference)\s*[:\-]\s*([^\n\r|]+?)(?:\s{2,}|\n|\||$)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return undefined;
}

export function parseBankAlert(text: string): ParsedAlert | null {
  if (!text || typeof text !== 'string') return null;
  const normalized = text.replace(/\s+/g, ' ').trim();

  // We require a "credit" signal (credited/received/credit alert/inflow/got) so
  // we don't accidentally parse debit alerts or transfer confirmations.
  const isCredit =
    /\b(credited|credit alert|received|got|inflow|you received|deposit)\b/i.test(normalized);
  if (!isCredit) return null;

  const amount = parseAmount(normalized);
  if (amount === null) return null;

  return {
    amount,
    sender: parseSender(normalized),
    ref: parseRef(normalized),
    bank: matchBank(normalized),
    currency: 'NGN',
  };
}

/** Does the parsed alert contain the given reference code (loose comparison)? */
export function alertContainsCode(alert: ParsedAlert, code: string): boolean {
  const hay = [alert.ref, alert.sender].filter(Boolean).join(' ').toUpperCase();
  const needle = code.toUpperCase().replace(/\s+/g, '');
  return hay.replace(/\s+/g, '').includes(needle);
}

/** Fuzzy name match — good enough for "JOHN DOE" vs "John A. Doe". */
export function namesMatch(a: string, b: string): boolean {
  const tokens = (s: string) =>
    new Set(
      s
        .toUpperCase()
        .replace(/[^A-Z\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 2),
    );
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return false;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  // Require at least 2 shared tokens, or 1 if that's all either side has.
  const min = Math.min(ta.size, tb.size);
  return overlap >= Math.max(1, Math.min(2, min));
}
