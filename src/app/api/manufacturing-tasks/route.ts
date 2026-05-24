import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { manufacturingTaskService } from '@/lib/services/manufacturingTask.service';
import type { TaskStatus, TaskPriority, TaskType } from '@/lib/services/manufacturingTask.service';

const createSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
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
  workerIds: z.array(z.string()).max(20).optional(),
});

/** GET /api/manufacturing-tasks?status=&productionOrderId=&take=&skip= */
export const GET = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const status = statusParam ? (statusParam.split(',') as TaskStatus[]) : undefined;
    const productionOrderId = searchParams.get('productionOrderId') ?? undefined;
    const take = Math.min(Number(searchParams.get('take') ?? 50), 200);
    const skip = Math.max(Number(searchParams.get('skip') ?? 0), 0);

    const result = await manufacturingTaskService.listForUser(auth.owner.id, {
      status,
      productionOrderId,
      take,
      skip,
    });
    return ok(result);
  });

/** POST /api/manufacturing-tasks */
export const POST = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const input = createSchema.parse(body);
    const task = await manufacturingTaskService.create(auth.owner.id, {
      title: input.title,
      description: input.description,
      taskType: input.taskType as TaskType | undefined,
      priority: input.priority as TaskPriority | undefined,
      productionOrderId: input.productionOrderId,
      targetQty: input.targetQty,
      plannedStartAt: input.plannedStartAt,
      plannedEndAt: input.plannedEndAt,
      notes: input.notes,
      workerIds: input.workerIds,
    });
    return ok(task, 201);
  });
