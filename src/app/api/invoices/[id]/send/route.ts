import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ensureInvoicePublicToken } from '@/lib/invoice-helpers';
import { documentAudit } from '@/lib/services/document-audit.service';
import { emailService } from '@/lib/services/email.service';
import { waLink } from '@/lib/whatsapp';
import { formatNaira } from '@/lib/format';

export const runtime = 'nodejs';

const bodySchema = z.object({
  /// Channel(s) the seller wants. Both is fine.
  channels: z.array(z.enum(['email', 'whatsapp'])).min(1).optional(),
  /// Override the customer email — useful when the invoice was created
  /// against a phone-only customer and the seller types one in now.
  email: z.string().email().optional(),
});

/**
 * POST /api/invoices/[id]/send
 *
 * Owner-only. Mints a publicToken if missing, lifts the invoice from
 * DRAFT -> SENT (and stamps `sentAt`), and:
 *   - sends an email when channels includes 'email' and we have an
 *     address. Non-fatal — surfaced in the response.
 *   - returns a wa.me deep-link the seller can hand to the customer
 *     when channels includes 'whatsapp'.
 *
 * Returns the public URL either way so the UI can copy-to-clipboard.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }
  const channels = parsed.data.channels ?? ['email', 'whatsapp'];

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId: user.id },
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      amountPaid: true,
      status: true,
      dueDate: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      publicToken: true,
    },
  });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (invoice.status === 'CANCELLED' || invoice.status === 'CREDITED') {
    return NextResponse.json(
      { error: 'This invoice is no longer active.' },
      { status: 409 },
    );
  }

  // Ensure a non-guessable share URL.
  const token = invoice.publicToken ?? (await ensureInvoicePublicToken(invoice.id));

  const baseUrl =
    process.env.APP_URL ||
    `https://${req.headers.get('host') ?? 'www.cashtraka.co'}`;
  const publicUrl = `${baseUrl}/invoice/${token}`;

  // Lift status (only when DRAFT) and stamp sentAt the first time.
  const newStatus = invoice.status === 'DRAFT' ? 'SENT' : invoice.status;
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: newStatus,
      sentAt: new Date(),
    },
  });

  const business =
    user.businessName?.trim() || user.name?.trim() || 'Your seller';
  const outstanding = Math.max(0, invoice.total - invoice.amountPaid);
  const amountForCustomer = outstanding > 0 ? outstanding : invoice.total;

  const result: {
    publicUrl: string;
    waLink: string | null;
    email: { ok: boolean; error?: string } | null;
  } = { publicUrl, waLink: null, email: null };

  // WhatsApp deep-link.
  if (channels.includes('whatsapp') && invoice.customerPhone) {
    const message =
      `Hi ${invoice.customerName}, here is your invoice ${invoice.invoiceNumber} ` +
      `from ${business} for ${formatNaira(amountForCustomer)}.\n` +
      `View and pay securely: ${publicUrl}`;
    result.waLink = waLink(invoice.customerPhone, message);
  }

  // Email (non-fatal).
  if (channels.includes('email')) {
    const to = parsed.data.email?.trim() || invoice.customerEmail?.trim() || '';
    if (to) {
      try {
        const send = await emailService.sendInvoice({
          to,
          customerName: invoice.customerName,
          business,
          invoiceNumber: invoice.invoiceNumber,
          amount: amountForCustomer,
          dueDate: invoice.dueDate,
          invoiceUrl: `/invoice/${token}`,
        });
        result.email = { ok: send.ok, error: send.ok ? undefined : send.error };
      } catch (e) {
        result.email = {
          ok: false,
          error: e instanceof Error ? e.message : 'Email send failed',
        };
      }
    } else {
      result.email = { ok: false, error: 'No email on file for this customer.' };
    }
  }

  await documentAudit.log({
    userId: user.id,
    actorId: user.id,
    entityType: 'INVOICE',
    entityId: invoice.id,
    action: 'SENT',
    metadata: {
      channels,
      emailOk: result.email?.ok ?? null,
      waSent: !!result.waLink,
    },
  });

  return NextResponse.json({ success: true, data: result });
}
