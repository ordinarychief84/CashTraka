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
 *
 * Supports `?format=csv` to stream a CSV download (same filters apply,
 * pagination is ignored, capped at 5000 rows).
 */
export async function GET(req: Request) {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const raw = Object.fromEntries(url.searchParams.entries());
    const parsed = feedbackFiltersSchema.safeParse(raw);
    if (!parsed.success) return validationFail(parsed.error);

    if (parsed.data.format === 'csv') {
      const csv = await feedbackService.exportCsv(user.id, {
        rating: parsed.data.rating,
        isNegative: parsed.data.isNegative,
        isResolved: parsed.data.isResolved,
        customerId: parsed.data.customerId,
        from: parsed.data.from,
        to: parsed.data.to,
      });
      const stamp = new Date().toISOString().slice(0, 10);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="service-check-${stamp}.csv"`,
          'Cache-Control': 'private, no-store',
        },
      });
    }

    const result = await feedbackService.listFeedback(user.id, parsed.data);
    return ok(result);
  });
}
