import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { shortageService } from '@/lib/services/shortage.service';

export const GET = () =>
  handled(async () => {
    const auth = await requireAuth();
    const rows = await shortageService.listOpenForUser(auth.owner.id);
    return ok({ rows });
  });
