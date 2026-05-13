import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { notificationService } from '@/lib/services/notification.service';

type Ctx = { params: { id: string } };

export const POST = (_req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const result = await notificationService.markRead(
      auth.owner.id,
      ctx.params.id,
    );
    return ok(result);
  });
