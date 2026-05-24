import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { manufacturingTaskService } from '@/lib/services/manufacturingTask.service';
import type { TaskPriority, TaskType } from '@/lib/services/manufacturingTask.service';

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  taskType: z
    .enum([
      'MIXING', 'CUTTING', 'SEWING', 'ASSEMBLY', 'WELDING', 'BAKING',
      'PACKAGING', 'LABELLING', 'QC_INSPECTION', 'LOADING', 'CLEANING', 'OTHER',
    ])
    .optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  productionOrderId: z.string().nullable().optional(),
  targetQty: z.number().int().positive().nullable().optional(),
  plannedStartAt: z.coerce.date().nullable().optional(),
  plannedEndAt: z.coerce.date().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

/** GET /api/manufacturing-tasks/[id] */
export const GET = (_req: Request, { params }: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    const task = await manufacturingTaskService.getForUser(auth.owner.id, params.id);
    return ok(task);
  });

/** PATCH /api/manufacturing-tasks/[id] */
export const PATCH = (req: Request, { params }: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const input = updateSchema.parse(body);
    const task = await manufacturingTaskService.update(auth.owner.id, params.id, {
      title: input.title,
      description: input.description,
      taskType: input.taskType as TaskType | undefined,
      priority: input.priority as TaskPriority | undefined,
      productionOrderId: input.productionOrderId,
      targetQty: input.targetQty,
      plannedStartAt: input.plannedStartAt,
      plannedEndAt: input.plannedEndAt,
      notes: input.notes,
    });
    return ok(task);
  });

/** DELETE /api/manufacturing-tasks/[id] — soft delete */
export const DELETE = (_req: Request, { params }: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    await manufacturingTaskService.softDelete(auth.owner.id, params.id);
    return ok({ deleted: true });
  });
