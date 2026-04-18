import { NextResponse } from 'next/server';
import { paylinkService } from '@/lib/services/paylink.service';

/** GET /api/pay/[token] — public: get paylink details for customer */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const paylink = await paylinkService.getByToken(token);

  if (!paylink) {
    return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
  }

  // Auto-mark as viewed
  if (!paylink.viewedAt) {
    await paylinkService.markViewed(token);
  }

  // Only expose safe fields to the public
  return NextResponse.json({
    linkNumber: paylink.linkNumber,
    customerName: paylink.customerName,
    amount: paylink.amount,
    description: paylink.description,
    status: paylink.status,
    businessName: paylink.user.businessName || paylink.user.name,
    bankName: paylink.user.bankName,
    bankAccountNumber: paylink.user.bankAccountNumber,
    bankAccountName: paylink.user.bankAccountName,
    createdAt: paylink.createdAt,
    expiresAt: paylink.expiresAt,
  });
}

/** POST /api/pay/[token] — public: customer claims "I've paid" */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const paylink = await paylinkService.getByToken(token);

  if (!paylink) {
    return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
  }

  if (['confirmed', 'cancelled', 'expired'].includes(paylink.status)) {
    return NextResponse.json({ error: `This payment link is already ${paylink.status}` }, { status: 400 });
  }

  if (paylink.status === 'claimed') {
    return NextResponse.json({ error: 'Payment already claimed — waiting for seller confirmation' }, { status: 400 });
  }

  await paylinkService.markClaimed(token);
  return NextResponse.json({ ok: true, message: 'Payment claimed. The seller will confirm shortly.' });
}
