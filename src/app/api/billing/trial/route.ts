import { z } from 'zod';
import { requirePermission } from '@/lib/auth';
import { billingService } from '@/lib/services/billing.service';
import { handled, ok, fail, validationFail } from '@/lib/api-response';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const schema = z.object({
  plan: z.enum(['business', 'business_plus', 'landlord', 'estate_manager']),
});

/**
 * POST /api/billing/trial — start a 14-day trial on the target plan.
 * Only works if the user has never trialled before.
 */
export const POST = (req: Request) =>
  handled(async () => {
    // Rate limit — one tenant can only start a trial once anyway (service
    // layer enforces that), but limit by IP too so a script rotating
    // accounts can't burn through trials. 3 attempts / hour / IP.
    const ip = clientIp(req);
    const limited = rateLimit('trial', ip, { max: 3, windowMs: 60 * 60_000 });
    if (!limited.allowed) {
      return fail('Too many trial attempts. Try again later.', 429);
    }

    const ctx = await requirePermission('billing.write');
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const result = await billingService.startTrial(ctx.owner.id, parsed.data.plan);
    return ok(result);
  });
