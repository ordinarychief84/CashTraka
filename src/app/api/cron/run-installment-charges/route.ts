/**
 * Vercel Cron, Run Installment Charges
 *
 * Processes all due installment plans by charging the customer's
 * stored Paystack authorization. Protected by CRON_SECRET.
 *
 * Schedule: 0 9 * * * (daily at 9 AM UTC / 10 AM WAT)
 *
 * Safety guarantees:
 * - Only processes ACTIVE plans with reusable authorization
 * - Skips plans with pending charges from today (prevents double-charge)
 * - Caps charge amount at remaining balance (prevents overcharge)
 * - Charge is NOT confirmed here, confirmation happens via webhook
 * - All attempts are logged in InstallmentCharge table
 */

import { NextResponse } from 'next/server';
import { recurringChargeService } from '@/lib/services/recurring-charge.service';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await recurringChargeService.runDueCharges();

    return NextResponse.json({
      ok: true,
      plansEvaluated: result.plansEvaluated,
      plansCharged: result.plansCharged,
      skipped: result.skipped,
      failures: result.failures,
      details: result.details,
    });
  } catch (error) {
    console.error('CRON_INSTALLMENT_CHARGES_ERROR:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal error during installment charge run' },
      { status: 500 },
    );
  }
}
