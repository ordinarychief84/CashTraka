import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { notificationService } from '@/lib/services/notification.service';

/**
 * GET /api/notifications/unread-count
 * Lightweight endpoint for the bell badge. Polled every ~60s by the
 * `NotificationsBell` client component.
 */
export const GET = () =>
  handled(async () => {
    const auth = await requireAuth();
    const count = await notificationService.unreadCount(auth.owner.id);
    return ok({ count });
  });
