import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { feedbackService } from '@/lib/services/feedback.service';

export const runtime = 'nodejs';

/**
 * GET /api/feedback/customer/[customerId]. Feedback history for a single
 * customer. Owner-scoped.
 */
export async function GET(
  _req: Request,
  { params }: { params: { customerId: string } },
) {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await feedbackService.getCustomerFeedback(params.customerId, user.id);
    return ok({ rows });
  });
}
