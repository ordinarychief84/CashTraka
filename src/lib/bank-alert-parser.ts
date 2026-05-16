/**
 * Bank-alert SMS parser. Nigerian SMEs receive transaction SMS alerts
 * from their bank when a customer transfers. The owner pastes that SMS
 * into CashTraka and we extract:
 *
 *   • amount in kobo
 *   • direction (credit / debit)
 *   • sender / payer name (when present)
 *   • bank name (the bank that sent the SMS)
 *   • reference (transaction code, when present)
 *
 * Each bank uses its own template. We pattern-match line by line so a
 * minor template change at one bank doesn't break the others.
 *
 * Returns `null` when nothing matched — the caller can still keep the
 * raw SMS as `Payment.bankAlertText` for manual review.
 */

export type ParsedBankAlert = {
  amountKobo: number;
  direction: 'credit' | 'debit';
  bank: string;
  payerName: string | null;
  reference: string | null;
  balanceKobo: number | null;
  /** When the parser is confident the SMS is a real credit alert worth
   * surfacing as a payment. False for fee SMS, marketing, OTP messages. */
  isPaymentCandidate: boolean;
};

/**
 * Three-way result for the from-alert flow (Decision 1 of 5).
 *
 *   success — we extracted both amount and sender; create Payment as-is.
 *   partial — we extracted the amount but not the sender; the owner is
 *             prompted to type the sender then a Payment is created with
 *             parseSource='PARTIAL'.
 *   failed  — we could not extract the amount at all; the owner falls
 *             back to a fully manual entry form and the Payment is
 *             created with parseSource='MANUAL_ENTERED'.
 *
 * The parser NEVER throws. Every code path returns one of these shapes
 * so the UI can render an unambiguous state and the user never sees a
 * silent failure.
 */
export type BankAlertParseResult =
  | {
      status: 'success';
      amountKobo: number;
      sender: string;
      direction: 'credit' | 'debit';
      bank: string;
      reference: string | null;
      balanceKobo: number | null;
    }
  | {
      status: 'partial';
      amountKobo: number;
      sender: null;
      direction: 'credit' | 'debit';
      bank: string;
      reference: string | null;
      balanceKobo: number | null;
    }
  | {
      status: 'failed';
      amountKobo: null;
      sender: null;
    };

/** Strip thousands separators + currency symbol from an amount substring. */
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[₦NGN, ]/gi, '').replace(/\.00$/, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  // SMS shows naira, store kobo.
  return Math.round(n * 100);
}

/** Generic credit/debit detector — most banks include these literals. */
function detectDirection(text: string): 'credit' | 'debit' | null {
  const upper = text.toUpperCase();
  if (/(CR|CREDIT|RECEIVED|INFLOW|DEPOSIT)/.test(upper)) return 'credit';
  if (/(DR|DEBIT|WITHDRAWAL|TRANSFER OUT|OUTFLOW|PURCHASE)/.test(upper)) return 'debit';
  return null;
}

/** Bank name lookups by characteristic phrasing. */
const BANK_PATTERNS: { name: string; match: RegExp }[] = [
  { name: 'GTBank', match: /\b(GTB|GTBank|Guaranty Trust)\b/i },
  { name: 'UBA', match: /\b(UBA|United Bank for Africa)\b/i },
  { name: 'Zenith Bank', match: /\bZenith\b/i },
  { name: 'Access Bank', match: /\bAccess\b/i },
  { name: 'First Bank', match: /\b(First Bank|FirstBank|FBN)\b/i },
  { name: 'FCMB', match: /\bFCMB\b/i },
  { name: 'Sterling', match: /\bSterling\b/i },
  { name: 'Stanbic', match: /\bStanbic\b/i },
  { name: 'Wema', match: /\bWema\b|\bALAT\b/i },
  { name: 'Kuda', match: /\bKuda\b/i },
  { name: 'Opay', match: /\bOpay\b/i },
  { name: 'Palmpay', match: /\bPalmpay\b/i },
  { name: 'Moniepoint', match: /\bMoniepoint\b/i },
];

function detectBank(text: string): string {
  for (const b of BANK_PATTERNS) {
    if (b.match.test(text)) return b.name;
  }
  return 'Unknown';
}

/**
 * Try to extract a payer name. The common patterns are:
 *   "Lodged by ADAEZE OKAFOR"
 *   "from ADAEZE OKAFOR"
 *   "Recvd from: ADAEZE OKAFOR"
 *   "Sender: ADAEZE OKAFOR"
 *   "From: ADAEZE OKAFOR/0123456789/GTB"
 * We capture up to the next punctuation or known terminator.
 */
function extractPayerName(text: string): string | null {
  const patterns = [
    /(?:lodg(?:ed|ment)\s+by|from|sender|payer|recvd from|paid by)[:\s]+([A-Z][A-Z\s\.\-']{2,60})(?=[\/,\.\n]|$)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const name = m[1].trim().replace(/\s+/g, ' ');
      // Filter junk: must contain at least 2 alpha chars + not be all bank-jargon.
      if (/[A-Za-z]{2,}/.test(name)) return name;
    }
  }
  return null;
}

function extractAmount(text: string): number | null {
  // ₦15,000.00  •  NGN15,000  •  N15000.00  •  15,000.00 NGN
  const patterns = [
    /(?:₦|NGN|N)\s*([\d,]+(?:\.\d{2})?)/i,
    /([\d,]+(?:\.\d{2})?)\s*(?:NGN|naira)/i,
    // Last-ditch: a "amt" or "amount" label
    /amt[:\s]+([\d,]+(?:\.\d{2})?)/i,
    /amount[:\s]+([\d,]+(?:\.\d{2})?)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const kobo = parseAmount(m[1]);
      if (kobo) return kobo;
    }
  }
  return null;
}

function extractBalance(text: string): number | null {
  const m = text.match(/(?:bal|balance|avail bal|new bal)[:\s]+(?:₦|NGN|N)?\s*([\d,]+(?:\.\d{2})?)/i);
  if (m && m[1]) return parseAmount(m[1]);
  return null;
}

function extractReference(text: string): string | null {
  // Common refs: "Ref: 1234567890", "TID:ABC123", "Trf Ref: PT2345"
  const m = text.match(/(?:ref|tid|trf ref|ref no|transaction id)[:\s]+([A-Z0-9\-_\/]{4,30})/i);
  if (m && m[1]) return m[1];
  return null;
}

export function parseBankAlert(raw: string): ParsedBankAlert | null {
  if (!raw || raw.length < 12) return null;
  const text = raw.replace(/\s+/g, ' ').trim();

  const amountKobo = extractAmount(text);
  const direction = detectDirection(text);
  if (!amountKobo || !direction) return null;

  const bank = detectBank(text);
  const payerName = extractPayerName(text);
  const reference = extractReference(text);
  const balanceKobo = extractBalance(text);

  // Heuristic: credit + payer + bank → high confidence this is a real
  // customer payment worth surfacing. Standalone credits with no payer
  // (e.g. interest, reversal) we still show but flag less confidently.
  const isPaymentCandidate = direction === 'credit' && amountKobo >= 100 /* ₦1+ */;

  return {
    amountKobo,
    direction,
    bank,
    payerName,
    reference,
    balanceKobo,
    isPaymentCandidate,
  };
}

/**
 * Three-way parse used by the from-alert ingest API + UI. NEVER throws —
 * always returns one of the three discriminated shapes so the caller can
 * render an unambiguous next step (parsed preview / sender prompt / full
 * manual entry).
 *
 * Discriminator rules:
 *   - amount missing OR direction missing OR input too short → 'failed'
 *   - amount present, sender missing                           → 'partial'
 *   - amount + sender both present                             → 'success'
 *
 * A debit-direction SMS still returns 'partial'/'success' so the calling
 * route can decide what to do with outbound transfers — the from-alert
 * ingest route rejects non-credit alerts itself.
 */
export function parseBankAlertResult(raw: string): BankAlertParseResult {
  try {
    if (!raw || typeof raw !== 'string' || raw.length < 12) {
      return { status: 'failed', amountKobo: null, sender: null };
    }
    const text = raw.replace(/\s+/g, ' ').trim();

    const amountKobo = extractAmount(text);
    const direction = detectDirection(text);
    if (!amountKobo || !direction) {
      return { status: 'failed', amountKobo: null, sender: null };
    }

    const bank = detectBank(text);
    const payerName = extractPayerName(text);
    const reference = extractReference(text);
    const balanceKobo = extractBalance(text);

    if (!payerName) {
      return {
        status: 'partial',
        amountKobo,
        sender: null,
        direction,
        bank,
        reference,
        balanceKobo,
      };
    }

    return {
      status: 'success',
      amountKobo,
      sender: payerName,
      direction,
      bank,
      reference,
      balanceKobo,
    };
  } catch {
    // Defensive: any unexpected regex / type error becomes 'failed' so the
    // caller can fall back to manual entry instead of bubbling a 500.
    return { status: 'failed', amountKobo: null, sender: null };
  }
}
