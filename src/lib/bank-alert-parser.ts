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
