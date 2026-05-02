import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PUBLIC endpoint, called when a customer taps "I've paid" on /pay/[code].
 * This records an UNVERIFIED claim (sets `claimedAt`). The seller must still
 * verify with their bank alert before shipping. We explicitly don't let
 * customer input flip `verified`.
 */
export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const payment = await prisma.payment.findUnique({
    where: { referenceCode: params.code },
  });
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Idempotent — record the first claim time, ignore subsequent taps.
  if (!payment.claimedAt) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { claimedAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
}
