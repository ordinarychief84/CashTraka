import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { paylinkService, whatsappPayLink } from '@/lib/services/paylink.service';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/services/email.service';

/** GET /api/paylinks/[id] — get a single paylink with WhatsApp link */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const paylink = await prisma.paymentRequest.findFirst({
    where: { id, userId: user.id },
    include: { customer: { select: { id: true, name: true, phone: true } } },
  });

  if (!paylink) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const waLink = whatsappPayLink({
    phone: paylink.customerPhone,
    customerName: paylink.customerName,
    amount: paylink.amount,
    token: paylink.token,
    businessName: user.businessName || user.name,
    description: paylink.description || undefined,
  });

  return NextResponse.json({ ...paylink, whatsappLink: waLink });
}

/** PATCH /api/paylinks/[id] — update status (confirm, cancel, mark WA sent, email sent) */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action } = body;

  try {
    switch (action) {
      case 'confirm': {
        const result = await paylinkService.confirm(id, user.id);
        return NextResponse.json(result);
      }
      case 'cancel': {
        const result = await paylinkService.cancel(id, user.id);
        return NextResponse.json(result);
      }
      case 'whatsapp_sent': {
        const result = await paylinkService.markWhatsAppSent(id, user.id);
        return NextResponse.json(result);
      }
      case 'email_sent': {
        const { customerEmail } = body;
        if (!customerEmail || typeof customerEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
          return NextResponse.json({ error: 'Valid customer email is required' }, { status: 400 });
        }

        const paylink = await prisma.paymentRequest.findFirst({
          where: { id, userId: user.id },
        });
        if (!paylink) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const appUrl = process.env.APP_URL || 'https://cashtraka.co';
        const payUrl = `${appUrl}/pay/${paylink.token}`;

        const emailResult = await emailService.sendPayLink({
          to: customerEmail,
          customerName: paylink.customerName,
          amount: paylink.amount,
          businessName: user.businessName || user.name,
          description: paylink.description || undefined,
          payUrl,
          linkNumber: paylink.linkNumber,
        });

        if (!emailResult.ok) {
          return NextResponse.json({ error: emailResult.error || 'Failed to send email' }, { status: 500 });
        }

        const result = await prisma.paymentRequest.update({
          where: { id, userId: user.id },
          data: { emailSentAt: new Date(), customerEmail },
        });
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Failed to update paylink' }, { status: 500 });
  }
}
