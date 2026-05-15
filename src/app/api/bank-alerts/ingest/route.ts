import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handled, ok, fail } from '@/lib/api-response';
import { parseBankAlert } from '@/lib/bank-alert-parser';
import { normalizeNigerianPhone } from '@/lib/whatsapp';

/**
 * POST /api/bank-alerts/ingest
 *
 * Owner pastes a raw bank-transaction SMS. We parse it (amount, direction,
 * payer name, bank, reference), fuzzy-match the payer to an existing
 * Customer when possible, and create an *unverified* Payment row that
 * the owner can then accept or reject from the payments page.
 *
 * Body:
 *   { rawText: string, customerId?: string }
 *
 * Returns:
 *   { paymentId, parsed: { amountKobo, payerName, bank, reference }, matchedCustomer? }
 *
 * If the parser can't extract amount/direction, returns 422 with the raw
 * text echoed back so the UI can fall back to manual entry.
 *
 * Verified=false on the created Payment — the owner accepts via the
 * existing Payment verification flow. We never auto-confirm based on an
 * SMS alone; SMS forgery is too easy.
 */
export const POST = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const rawText = typeof body?.rawText === 'string' ? body.rawText.trim() : '';
    const passedCustomerId =
      typeof body?.customerId === 'string' && body.customerId.length > 0 ? body.customerId : null;

    if (!rawText || rawText.length < 12) {
      return fail('Paste the full bank SMS — at least 12 characters.', 400);
    }

    const parsed = parseBankAlert(rawText);
    if (!parsed) {
      return fail(
        'Could not read the SMS. Make sure it shows amount and "CR/credit" or "DR/debit".',
        422,
      );
    }

    if (parsed.direction !== 'credit') {
      return fail(
        'Looks like a debit / outgoing SMS. Only credit alerts (incoming money) create payments.',
        422,
      );
    }

    // Try to match a customer.
    //   1. Explicit `customerId` from the caller wins.
    //   2. Fall back to fuzzy name match on the parsed payer (case-insensitive contains).
    let customerId: string | null = passedCustomerId;
    let matchedBy: 'explicit' | 'name' | 'none' = passedCustomerId ? 'explicit' : 'none';

    if (!customerId && parsed.payerName) {
      const candidate = await prisma.customer.findFirst({
        where: {
          userId: auth.owner.id,
          name: { contains: parsed.payerName, mode: 'insensitive' },
        },
        select: { id: true, name: true, phone: true },
      });
      if (candidate) {
        customerId = candidate.id;
        matchedBy = 'name';
      }
    }

    if (!customerId) {
      // Create a stub "Unknown Sender" customer so the payment still attaches
      // to something. The owner can re-link from the payments page.
      const stub = await prisma.customer.create({
        data: {
          userId: auth.owner.id,
          name: parsed.payerName ?? 'Unknown sender (bank alert)',
          phone: '',
        },
        select: { id: true, name: true, phone: true },
      });
      customerId = stub.id;
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, phone: true },
    });
    if (!customer) {
      return fail('Customer could not be resolved.', 500);
    }

    const phoneSnapshot = customer.phone ? normalizeNigerianPhone(customer.phone) : '';

    const payment = await prisma.payment.create({
      data: {
        userId: auth.owner.id,
        customerId: customer.id,
        customerNameSnapshot: customer.name,
        phoneSnapshot,
        amount: Math.round(parsed.amountKobo / 100),
        amountKobo: parsed.amountKobo,
        status: 'PAID',
        verified: false,
        verificationMethod: 'BANK_ALERT_SMS',
        bankAlertText: rawText,
        bankAlertSenderName: parsed.payerName,
        bankAlertBank: parsed.bank,
        referenceCode: parsed.reference,
      },
      select: { id: true },
    });

    return ok({
      paymentId: payment.id,
      parsed: {
        amountKobo: parsed.amountKobo,
        payerName: parsed.payerName,
        bank: parsed.bank,
        reference: parsed.reference,
      },
      matchedCustomer: { id: customer.id, name: customer.name, matchedBy },
    });
  });
