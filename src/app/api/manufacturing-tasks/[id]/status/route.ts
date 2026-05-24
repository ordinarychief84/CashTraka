import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { manufacturingTaskService } from '@/lib/services/manufacturingTask.service';
import type { TaskStatus } from '@/lib/services/manufacturingTask.service';

const schema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'ON_HOLD', 'DONE', 'CANCELLED']),
  note: z.string().max(500).optional(),
  completedQty: z.number().int().min(0).optional(),
});

/** POST /api/manufacturing-tasks/[id]/status */
export const POST = (req: Request, { params }: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const { status, note, completedQty } = schema.parse(body);
    const task = await manufacturingTaskService.changeStatus(
      auth.owner.id,
      params.id,
      status as TaskStatus,
      { note, completedQty },
    );
    return ok(task);
  });
