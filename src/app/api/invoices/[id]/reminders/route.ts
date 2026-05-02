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

const REMINDER_COPY: Record<
  string,
  { subject: (n: string) => string; lead: string }
> = {
  FRIENDLY_REMINDER: {
    subject: (n) => `Friendly reminder: invoice ${n}`,
    lead: "Just a friendly reminder that the following invoice is awaiting payment.",
  },
  OVERDUE_NOTICE: {
    subject: (n) => `Overdue: invoice ${n}`,
    lead: "Your invoice is past its due date. Please settle the balance at your earliest convenience.",
  },
  FINAL_NOTICE: {
    subject: (n) => `Final notice: invoice ${n}`,
    lead: "This is a final notice for your outstanding invoice. Please pay immediately to avoid further action.",
  },
};

const bodySchema = z.object({
  type: z.enum(['FRIENDLY_REMINDER', 'OVERDUE_NOTICE', 'FINAL_NOTICE']).default('FRIENDLY_REMINDER'),
  channel: z.enum(['EMAIL', 'WHATSAPP']),
  email: z.string().email().optional(),
});

/**
 * GET  /api/invoices/[id]/reminders → list reminders previously sent.
 * POST /api/invoices/[id]/reminders → fire one off (email or WhatsApp).
 *
 * For WhatsApp the server returns a wa.me link the seller's browser can
 * open — we don't push messages to WA on the seller's behalf.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reminders = await prisma.invoiceReminder.findMany({
    where: { invoiceId: params.id, userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  return NextResponse.json({ success: true, data: reminders });
}

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
  const { type, channel } = parsed.data;

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
  const outstanding = Math.max(0, invoice.total - invoice.amountPaid);
  if (outstanding <= 0) {
    return NextResponse.json(
      { error: 'This invoice is already fully paid.' },
      { status: 409 },
    );
  }

  const token = invoice.publicToken ?? (await ensureInvoicePublicToken(invoice.id));
  const baseUrl =
    process.env.APP_URL ||
    `https://${req.headers.get('host') ?? 'www.cashtraka.co'}`;
  const publicUrl = `${baseUrl}/invoice/${token}`;

  const business = user.businessName?.trim() || user.name?.trim() || 'Your seller';
  const copy = REMINDER_COPY[type];
  const message =
    `${copy.lead}\n\n` +
    `Invoice ${invoice.invoiceNumber} from ${business}\n` +
    `Amount due: ${formatNaira(outstanding)}\n` +
    `View and pay: ${publicUrl}`;

  let sent = false;
  let error: string | null = null;
  let resultLink: string | null = null;

  if (channel === 'WHATSAPP') {
    if (!invoice.customerPhone) {
      return NextResponse.json(
        { error: 'No phone number on file for this customer.' },
        { status: 400 },
      );
    }
    resultLink = waLink(invoice.customerPhone, message);
    sent = true; // We created the link; the seller's browser opens it.
  } else {
    const to = parsed.data.email?.trim() || invoice.customerEmail?.trim() || '';
    if (!to) {
      return NextResponse.json(
        { error: 'No email on file for this customer.' },
        { status: 400 },
      );
    }
    try {
      const r = await emailService.sendInvoice({
        to,
        customerName: invoice.customerName,
        business,
        invoiceNumber: invoice.invoiceNumber,
        amount: outstanding,
        dueDate: invoice.dueDate,
        invoiceUrl: `/invoice/${token}`,
      });
      sent = r.ok;
      if (!r.ok) error = r.error ?? 'Email send failed';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Email send failed';
    }
  }

  const reminder = await prisma.invoiceReminder.create({
    data: {
      userId: user.id,
      invoiceId: invoice.id,
      type,
      channel,
      message,
      status: sent ? 'SENT' : 'FAILED',
      sentAt: sent ? new Date() : null,
    },
  });

  documentAudit.log({
    userId: user.id,
    actorId: user.id,
    entityType: 'INVOICE',
    entityId: invoice.id,
    action: sent ? 'REMINDER_SENT' : 'REMINDER_FAILED',
    metadata: { reminderId: reminder.id, type, channel, error: error ?? undefined },
  });

  return NextResponse.json({
    success: sent,
    data: {
      reminder,
      waLink: resultLink,
      error,
    },
  });
}
