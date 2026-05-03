import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { handled, ok, validationFail } from '@/lib/api-response';
import { feedbackService } from '@/lib/services/feedback.service';
import { feedbackFiltersSchema } from '@/lib/feedback-validators';

export const runtime = 'nodejs';

/**
 * GET /api/feedback
 *
 * Owner-scoped paginated list. Stays accessible on the free plan so users
 * who downgrade can still see their existing feedback history.
 */
export async function GET(req: Request) {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const raw = Object.fromEntries(url.searchParams.entries());
    const parsed = feedbackFiltersSchema.safeParse(raw);
    if (!parsed.success) return validationFail(parsed.error);

    const result = await feedbackService.listFeedback(user.id, parsed.data);
    return ok(result);
  });
}
