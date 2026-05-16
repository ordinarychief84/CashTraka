import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handled, ok, fail } from '@/lib/api-response';
import { parseBankAlertResult } from '@/lib/bank-alert-parser';
import { normalizeNigerianPhone } from '@/lib/whatsapp';

/**
 * POST /api/bank-alerts/ingest  (Decision 1 of 5 — failure states wired up)
 *
 * Owner pastes a raw bank-transaction SMS. We run it through
 * `parseBankAlertResult()` which never throws and returns one of:
 *
 *   - { status: 'success' }  → amount + sender extracted. Create Payment
 *                              with parseSource='AUTO'.
 *   - { status: 'partial' }  → amount extracted, sender unknown. Return
 *                              the parse to the client so it can prompt
 *                              for the sender. If the client also passes
 *                              a `manualSender` in the body we create the
 *                              Payment with parseSource='PARTIAL'.
 *   - { status: 'failed'  }  → couldn't read the SMS at all. The client
 *                              switches to a fully manual entry form and
 *                              re-posts with `manualAmountKobo` +
 *                              `manualSender` + `manualDate` → Payment is
 *                              created with parseSource='MANUAL_ENTERED'.
 *
 * Verified=false on every created Payment — the owner accepts via the
 * existing Payment verification flow. We never auto-confirm based on an
 * SMS alone; SMS forgery is too easy.
 *
 * Request body:
 *   {
 *     rawText?: string,            // the pasted SMS (any length, server validates)
 *     manualAmountKobo?: number,   // integer kobo, only when STATE C falls through
 *     manualSender?: string,       // owner-typed sender name (STATE B or C)
 *     manualDate?: string,         // ISO date string (STATE C only)
 *     customerId?: string,         // optional explicit customer link
 *   }
 *
 * Response (parse-only path, no Payment yet):
 *   { status: 'partial' | 'failed', amountKobo?, bank?, reference?, balanceKobo? }
 *
 * Response (Payment created):
 *   { paymentId, parseSource, matchedCustomer? }
 */
export const POST = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json().catch(() => ({}));

    const rawText = typeof body?.rawText === 'string' ? body.rawText.trim() : '';
    const manualAmountKoboRaw = body?.manualAmountKobo;
    const manualSenderRaw =
      typeof body?.manualSender === 'string' ? body.manualSender.trim() : '';
    const manualDateRaw = typeof body?.manualDate === 'string' ? body.manualDate.trim() : '';
    const passedCustomerId =
      typeof body?.customerId === 'string' && body.customerId.length > 0
        ? body.customerId
        : null;

    const manualAmountKobo =
      typeof manualAmountKoboRaw === 'number' &&
      Number.isInteger(manualAmountKoboRaw) &&
      manualAmountKoboRaw > 0
        ? manualAmountKoboRaw
        : null;

    // CASE: STATE C fully manual. Owner typed amount + sender + date.
    if (manualAmountKobo && manualSenderRaw) {
      return createManualPayment({
        userId: auth.owner.id,
        amountKobo: manualAmountKobo,
        sender: manualSenderRaw,
        dateIso: manualDateRaw,
        rawText,
        passedCustomerId,
        parseSource: 'MANUAL_ENTERED',
      });
    }

    if (!rawText || rawText.length < 12) {
      // No SMS AND no manual amount → ask for SMS. Distinct from a
      // parse-failure: this is just a missing input.
      return fail('Paste the full bank SMS — at least 12 characters.', 400);
    }

    const parsed = parseBankAlertResult(rawText);

    // STATE C: parser failed completely. Return 200 with status so the UI
    // can render the manual-entry fallback instead of an error toast.
    if (parsed.status === 'failed') {
      return ok({
        status: 'failed' as const,
      });
    }

    if (parsed.direction !== 'credit') {
      return fail(
        'Looks like a debit / outgoing SMS. Only credit alerts (incoming money) create payments.',
        422,
      );
    }

    // STATE B: amount auto, sender missing.
    //   - If the owner typed a manualSender in the same request → create
    //     the Payment now with parseSource='PARTIAL'.
    //   - Otherwise return 200 with the partial parse so the UI can
    //     render the "Who sent this?" prompt.
    if (parsed.status === 'partial') {
      if (manualSenderRaw) {
        return createPaymentFromAlert({
          userId: auth.owner.id,
          amountKobo: parsed.amountKobo,
          sender: manualSenderRaw,
          rawText,
          bank: parsed.bank,
          reference: parsed.reference,
          passedCustomerId,
          parseSource: 'PARTIAL',
        });
      }
      return ok({
        status: 'partial' as const,
        amountKobo: parsed.amountKobo,
        bank: parsed.bank,
        reference: parsed.reference,
        balanceKobo: parsed.balanceKobo,
      });
    }

    // STATE A: full success.
    return createPaymentFromAlert({
      userId: auth.owner.id,
      amountKobo: parsed.amountKobo,
      sender: parsed.sender,
      rawText,
      bank: parsed.bank,
      reference: parsed.reference,
      passedCustomerId,
      parseSource: 'AUTO',
    });
  });

/* ─── Helpers ─────────────────────────────────────────────────────────── */

type AlertPaymentArgs = {
  userId: string;
  amountKobo: number;
  sender: string;
  rawText: string;
  bank: string;
  reference: string | null;
  passedCustomerId: string | null;
  parseSource: 'AUTO' | 'PARTIAL';
};

async function createPaymentFromAlert(args: AlertPaymentArgs) {
  const customer = await resolveOrStubCustomer(args.userId, args.sender, args.passedCustomerId);
  const phoneSnapshot = customer.phone ? normalizeNigerianPhone(customer.phone) : '';

  const payment = await prisma.payment.create({
    data: {
      userId: args.userId,
      customerId: customer.id,
      customerNameSnapshot: customer.name,
      phoneSnapshot,
      amount: Math.round(args.amountKobo / 100),
      amountKobo: args.amountKobo,
      status: 'PAID',
      verified: false,
      verificationMethod: 'BANK_ALERT_SMS',
      bankAlertText: args.rawText,
      bankAlertSenderName: args.sender,
      bankAlertBank: args.bank,
      referenceCode: args.reference,
      parseSource: args.parseSource,
    },
    select: { id: true },
  });

  return ok({
    paymentId: payment.id,
    parseSource: args.parseSource,
    parsed: {
      amountKobo: args.amountKobo,
      payerName: args.sender,
      bank: args.bank,
      reference: args.reference,
    },
    matchedCustomer: { id: customer.id, name: customer.name },
  });
}

type ManualPaymentArgs = {
  userId: string;
  amountKobo: number;
  sender: string;
  dateIso: string;
  rawText: string;
  passedCustomerId: string | null;
  parseSource: 'MANUAL_ENTERED';
};

async function createManualPayment(args: ManualPaymentArgs) {
  const createdAt = args.dateIso ? safeParseDate(args.dateIso) : null;
  const customer = await resolveOrStubCustomer(args.userId, args.sender, args.passedCustomerId);
  const phoneSnapshot = customer.phone ? normalizeNigerianPhone(customer.phone) : '';

  const payment = await prisma.payment.create({
    data: {
      userId: args.userId,
      customerId: customer.id,
      customerNameSnapshot: customer.name,
      phoneSnapshot,
      amount: Math.round(args.amountKobo / 100),
      amountKobo: args.amountKobo,
      status: 'PAID',
      verified: false,
      verificationMethod: 'BANK_ALERT_SMS',
      bankAlertText: args.rawText || null,
      bankAlertSenderName: args.sender,
      bankAlertBank: 'Manual entry',
      referenceCode: null,
      parseSource: args.parseSource,
      ...(createdAt ? { createdAt } : {}),
    },
    select: { id: true },
  });

  return ok({
    paymentId: payment.id,
    parseSource: args.parseSource,
    matchedCustomer: { id: customer.id, name: customer.name },
  });
}

function safeParseDate(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Find an existing customer by explicit ID or fuzzy name match, otherwise
 * create a stub so the Payment always has somewhere to attach.
 */
async function resolveOrStubCustomer(
  userId: string,
  senderName: string,
  passedCustomerId: string | null,
): Promise<{ id: string; name: string; phone: string }> {
  if (passedCustomerId) {
    const c = await prisma.customer.findUnique({
      where: { id: passedCustomerId },
      select: { id: true, name: true, phone: true, userId: true },
    });
    if (c && c.userId === userId) return { id: c.id, name: c.name, phone: c.phone };
  }

  if (senderName) {
    const candidate = await prisma.customer.findFirst({
      where: { userId, name: { contains: senderName, mode: 'insensitive' } },
      select: { id: true, name: true, phone: true },
    });
    if (candidate) return candidate;
  }

  const stub = await prisma.customer.create({
    data: { userId, name: senderName || 'Unknown sender (bank alert)', phone: '' },
    select: { id: true, name: true, phone: true },
  });
  return stub;
}
