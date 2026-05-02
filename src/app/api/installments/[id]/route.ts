/**
 * GET    /api/installments/[id], Get installment plan detail with charge history.
 * POST   /api/installments/[id], Cancel an installment plan.
 */

import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { handled } from '@/lib/api-response';
import { installmentService } from '@/lib/services/installment.service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  return handled(async () => {
    const auth = await getAuthContext();
    const { id } = await ctx.params;

    const plan = await installmentService.getById(id, auth.userId);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Installment plan not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: plan });
  });
}

/**
 * POST /api/installments/[id] with body { action: "cancel" }
 * Cancels the installment plan, stopping all future charges.
 */
export async function POST(req: Request, ctx: Ctx) {
  return handled(async () => {
    const auth = await getAuthContext();
    const { id } = await ctx.params;
    const body = await req.json();

    if (body.action !== 'cancel') {
      return NextResponse.json(
        { success: false, error: 'Unknown action. Supported: "cancel"' },
        { status: 400 },
      );
    }

    await installmentService.cancel(id, auth.userId);

    return NextResponse.json({
      success: true,
      message: 'Installment plan cancelled. No further charges will be made.',
    });
  });
}
