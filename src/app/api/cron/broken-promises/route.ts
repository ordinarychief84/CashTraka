import { NextResponse } from 'next/server';
import { promiseToPayService } from '@/lib/services/promise-to-pay.service';

/**
 * GET /api/cron/broken-promises
 *
 * Runs daily. Marks PROMISED promises as BROKEN if the committed date has passed
 * without verified payment.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const count = await promiseToPayService.markBrokenPromises();
    return NextResponse.json({ success: true, data: { brokenCount: count } });
  } catch (e: any) {
    console.error('CRON_BROKEN_PROMISES_ERROR:', e?.message ?? e);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
