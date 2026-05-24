import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { manufacturingTaskService } from '@/lib/services/manufacturingTask.service';

const addSchema = z.object({
  staffMemberId: z.string().min(1),
  role: z.enum(['LEAD', 'WORKER']).optional(),
});

const removeSchema = z.object({
  staffMemberId: z.string().min(1),
});

/** POST /api/manufacturing-tasks/[id]/workers — assign a worker */
export const POST = (req: Request, { params }: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const { staffMemberId, role } = addSchema.parse(body);
    const worker = await manufacturingTaskService.addWorker(
      auth.owner.id,
      params.id,
      staffMemberId,
      role ?? 'WORKER',
    );
    return ok(worker, 201);
  });

/** DELETE /api/manufacturing-tasks/[id]/workers — remove a worker */
export const DELETE = (req: Request, { params }: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const { staffMemberId } = removeSchema.parse(body);
    await manufacturingTaskService.removeWorker(auth.owner.id, params.id, staffMemberId);
    return ok({ removed: true });
  });
