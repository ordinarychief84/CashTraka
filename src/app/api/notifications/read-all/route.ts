import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { notificationService } from '@/lib/services/notification.service';

export const POST = () =>
  handled(async () => {
    const auth = await requireAuth();
    const result = await notificationService.markAllRead(auth.owner.id);
    return ok(result);
  });
