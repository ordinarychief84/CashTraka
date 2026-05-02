/**
 * GET  /api/installments, List installment plans for the authenticated user.
 * POST /api/installments, Create a new installment plan.
 */

import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { handled } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { installmentService, type InstallmentInterval } from '@/lib/services/installment.service';
import { z } from 'zod';

const createSchema = z.object({
  promiseToPayId: z.string().optional(),
  debtId: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(7),
  totalAmount: z.coerce.number().positive(),
  initialAmount: z.coerce.number().nonnegative().optional(),
  recurringAmount: z.coerce.number().positive(),
  interval: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']),
  totalInstallments: z.coerce.number().int().positive().optional(),
  paystackAuthorizationCode: z.string().min(1),
  paystackAuthorizationReusable: z.literal(true),
  paystackCustomerCode: z.string().optional(),
  paystackEmail: z.string().email(),
});

export async function GET() {
  return handled(async () => {
    const auth = await getAuthContext();
    const plans = await installmentService.listForUser(auth.userId);
    return NextResponse.json({ success: true, data: plans });
  });
}

export async function POST(req: Request) {
  return handled(async () => {
    const auth = await getAuthContext();
    const body = await req.json();
    const input = createSchema.parse(body);

    const plan = await installmentService.create({
      userId: auth.userId,
      ...input,
      interval: input.interval as InstallmentInterval,
    });

    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  });
}
