import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { manufacturingTaskService } from '@/lib/services/manufacturingTask.service';

const schema = z.object({
  progress: z.number().int().min(0).max(100),
  note: z.string().max(500).optional(),
});

/** POST /api/manufacturing-tasks/[id]/progress */
export const POST = (req: Request, { params }: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const { progress, note } = schema.parse(body);
    const task = await manufacturingTaskService.updateProgress(
      auth.owner.id,
      params.id,
      progress,
      note,
    );
    return ok(task);
  });
