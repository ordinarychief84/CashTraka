import { requireAdmin } from '@/lib/auth';
import { analyticsService } from '@/lib/services/analytics.service';
import { handled, ok } from '@/lib/api-response';

/** GET /api/admin/metrics — headline KPIs for the admin dashboard. */
export const GET = () =>
  handled(async () => {
    await requireAdmin();
    const data = await analyticsService.systemMetrics();
    return ok(data);
  });
