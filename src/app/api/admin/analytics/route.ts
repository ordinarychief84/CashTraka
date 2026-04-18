import { requireAdmin } from '@/lib/auth';
import { analyticsService } from '@/lib/services/analytics.service';
import { handled, ok } from '@/lib/api-response';

/** GET /api/admin/analytics?months=6 — monthly trend series. */
export const GET = (req: Request) =>
  handled(async () => {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const months = Math.min(Math.max(Number(searchParams.get('months') ?? 6), 1), 24);
    const data = await analyticsService.monthlyTrends(months);
    return ok(data);
  });
