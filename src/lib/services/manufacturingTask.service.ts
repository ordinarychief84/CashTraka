import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { nextManufacturingTaskNumber } from '@/lib/op-numbers';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'ON_HOLD' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type TaskType =
  | 'MIXING'
  | 'CUTTING'
  | 'SEWING'
  | 'ASSEMBLY'
  | 'WELDING'
  | 'BAKING'
  | 'PACKAGING'
  | 'LABELLING'
  | 'QC_INSPECTION'
  | 'LOADING'
  | 'CLEANING'
  | 'OTHER';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  MIXING: 'Mixing',
  CUTTING: 'Cutting',
  SEWING: 'Sewing',
  ASSEMBLY: 'Assembly',
  WELDING: 'Welding',
  BAKING: 'Baking',
  PACKAGING: 'Packaging',
  LABELLING: 'Labelling',
  QC_INSPECTION: 'QC Inspection',
  LOADING: 'Loading',
  CLEANING: 'Cleaning',
  OTHER: 'Other',
};

/**
 * Valid status transitions. CANCELLED and DONE are terminal (no forward transitions).
 */
const ALLOWED: Record<TaskStatus, TaskStatus[]> = {
  PENDING: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'DONE', 'CANCELLED'],
  ON_HOLD: ['PENDING', 'IN_PROGRESS', 'CANCELLED'],
  DONE: [],
  CANCELLED: [],
};

export type ManufacturingTaskCreateInput = {
  title: string;
  description?: string | null;
  taskType?: TaskType;
  priority?: TaskPriority;
  productionOrderId?: string | null;
  targetQty?: number | null;
  plannedStartAt?: Date | null;
  plannedEndAt?: Date | null;
  notes?: string | null;
  workerIds?: string[];
};

export type ManufacturingTaskUpdateInput = Partial<{
  title: string;
  description: string | null;
  taskType: TaskType;
  priority: TaskPriority;
  productionOrderId: string | null;
  targetQty: number | null;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  notes: string | null;
}>;

// The full shape returned for list and detail views
const TASK_SELECT = {
  id: true,
  taskNumber: true,
  userId: true,
  productionOrderId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  taskType: true,
  targetQty: true,
  completedQty: true,
  progress: true,
  plannedStartAt: true,
  plannedEndAt: true,
  startedAt: true,
  completedAt: true,
  notes: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  productionOrder: {
    select: { id: true, productionNumber: true, title: true },
  },
  workers: {
    select: {
      id: true,
      role: true,
      assignedAt: true,
      staffMember: {
        select: { id: true, name: true, role: true, phone: true },
      },
    },
  },
} as const;

// ── Service ───────────────────────────────────────────────────────────────────

export const manufacturingTaskService = {
  /** List tasks for a user with optional filters. */
  async listForUser(
    userId: string,
    opts?: {
      status?: TaskStatus | TaskStatus[];
      productionOrderId?: string;
      take?: number;
      skip?: number;
      includeDeleted?: boolean;
    },
  ) {
    const take = Math.min(opts?.take ?? 50, 200);
    const skip = Math.max(opts?.skip ?? 0, 0);

    const statusFilter = Array.isArray(opts?.status)
      ? { in: opts!.status }
      : opts?.status
        ? { equals: opts.status }
        : undefined;

    const where = {
      userId,
      deletedAt: opts?.includeDeleted ? undefined : null,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(opts?.productionOrderId ? { productionOrderId: opts.productionOrderId } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.manufacturingTask.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { plannedEndAt: 'asc' }, { createdAt: 'desc' }],
        take,
        skip,
        select: TASK_SELECT,
      }),
      prisma.manufacturingTask.count({ where }),
    ]);

    return { rows, total };
  },

  /** Get a single task with its activity log. Throws if not found. */
  async getForUser(userId: string, id: string) {
    const task = await prisma.manufacturingTask.findFirst({
      where: { id, userId, deletedAt: null },
      select: {
        ...TASK_SELECT,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            type: true,
            note: true,
            fromStatus: true,
            toStatus: true,
            progress: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!task) throw Err.notFound('Task not found');
    return task;
  },

  /** Create a new manufacturing task. */
  async create(userId: string, input: ManufacturingTaskCreateInput) {
    // Validate productionOrderId belongs to this user
    if (input.productionOrderId) {
      const po = await prisma.productionOrder.findFirst({
        where: { id: input.productionOrderId, userId },
        select: { id: true },
      });
      if (!po) throw Err.notFound('Production order not found');
    }

    const taskNumber = await nextManufacturingTaskNumber(userId);

    return prisma.$transaction(async (tx) => {
      const created = await tx.manufacturingTask.create({
        data: {
          userId,
          taskNumber,
          title: input.title,
          description: input.description ?? null,
          taskType: input.taskType ?? 'OTHER',
          priority: input.priority ?? 'NORMAL',
          productionOrderId: input.productionOrderId ?? null,
          targetQty: input.targetQty ?? null,
          plannedStartAt: input.plannedStartAt ?? null,
          plannedEndAt: input.plannedEndAt ?? null,
          notes: input.notes ?? null,
          status: 'PENDING',
          progress: 0,
        },
        select: TASK_SELECT,
      });

      // Assign workers
      if (input.workerIds && input.workerIds.length > 0) {
        await tx.manufacturingTaskWorker.createMany({
          data: input.workerIds.map((sid) => ({
            manufacturingTaskId: created.id,
            staffMemberId: sid,
            role: 'WORKER',
          })),
          skipDuplicates: true,
        });
      }

      await tx.manufacturingTaskActivity.create({
        data: {
          manufacturingTaskId: created.id,
          userId,
          type: 'STATUS_CHANGE',
          toStatus: 'PENDING',
          note: 'Task created',
        },
      });

      return created;
    });
  },

  /** Update a task's mutable fields. */
  async update(userId: string, id: string, input: ManufacturingTaskUpdateInput) {
    const existing = await prisma.manufacturingTask.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw Err.notFound('Task not found');

    if (input.productionOrderId) {
      const po = await prisma.productionOrder.findFirst({
        where: { id: input.productionOrderId, userId },
        select: { id: true },
      });
      if (!po) throw Err.notFound('Production order not found');
    }

    return prisma.manufacturingTask.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.taskType !== undefined && { taskType: input.taskType }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.productionOrderId !== undefined && {
          productionOrderId: input.productionOrderId,
        }),
        ...(input.targetQty !== undefined && { targetQty: input.targetQty }),
        ...(input.plannedStartAt !== undefined && { plannedStartAt: input.plannedStartAt }),
        ...(input.plannedEndAt !== undefined && { plannedEndAt: input.plannedEndAt }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
      select: TASK_SELECT,
    });
  },

  /** Transition task to a new status. Validates allowed transitions. */
  async changeStatus(
    userId: string,
    id: string,
    toStatus: TaskStatus,
    opts?: { note?: string; completedQty?: number },
  ) {
    const task = await prisma.manufacturingTask.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!task) throw Err.notFound('Task not found');

    const from = task.status as TaskStatus;
    if (!ALLOWED[from].includes(toStatus)) {
      throw Err.validation(
        `Cannot transition from ${from} to ${toStatus}. Allowed: ${ALLOWED[from].join(', ') || 'none'}`,
      );
    }

    const now = new Date();
    const updates: Record<string, unknown> = { status: toStatus };
    if (toStatus === 'IN_PROGRESS' && from !== 'IN_PROGRESS') {
      updates.startedAt = updates.startedAt ?? now;
    }
    if (toStatus === 'DONE') {
      updates.completedAt = now;
      updates.progress = 100;
      if (opts?.completedQty !== undefined) updates.completedQty = opts.completedQty;
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.manufacturingTask.update({
        where: { id },
        data: updates,
        select: TASK_SELECT,
      });

      await tx.manufacturingTaskActivity.create({
        data: {
          manufacturingTaskId: id,
          userId,
          type: 'STATUS_CHANGE',
          fromStatus: from,
          toStatus,
          note: opts?.note ?? null,
        },
      });

      return updated;
    });
  },

  /** Update progress percentage (0-100). */
  async updateProgress(userId: string, id: string, progress: number, note?: string) {
    const task = await prisma.manufacturingTask.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });
    if (!task) throw Err.notFound('Task not found');

    const clamped = Math.max(0, Math.min(100, Math.round(progress)));

    return prisma.$transaction(async (tx) => {
      const updated = await tx.manufacturingTask.update({
        where: { id },
        data: { progress: clamped },
        select: TASK_SELECT,
      });

      await tx.manufacturingTaskActivity.create({
        data: {
          manufacturingTaskId: id,
          userId,
          type: 'PROGRESS_UPDATE',
          progress: clamped,
          note: note ?? null,
        },
      });

      return updated;
    });
  },

  /** Assign a worker to a task. */
  async addWorker(userId: string, taskId: string, staffMemberId: string, role = 'WORKER') {
    const task = await prisma.manufacturingTask.findFirst({
      where: { id: taskId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!task) throw Err.notFound('Task not found');

    const staff = await prisma.staffMember.findFirst({
      where: { id: staffMemberId, userId },
      select: { id: true, name: true },
    });
    if (!staff) throw Err.notFound('Staff member not found');

    const worker = await prisma.manufacturingTaskWorker.upsert({
      where: {
        manufacturingTaskId_staffMemberId: {
          manufacturingTaskId: taskId,
          staffMemberId,
        },
      },
      create: { manufacturingTaskId: taskId, staffMemberId, role },
      update: { role },
    });

    await prisma.manufacturingTaskActivity.create({
      data: {
        manufacturingTaskId: taskId,
        userId,
        type: 'WORKER_ADDED',
        note: `${staff.name} assigned as ${role.toLowerCase()}`,
      },
    });

    return worker;
  },

  /** Remove a worker from a task. */
  async removeWorker(userId: string, taskId: string, staffMemberId: string) {
    const task = await prisma.manufacturingTask.findFirst({
      where: { id: taskId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!task) throw Err.notFound('Task not found');

    const staff = await prisma.staffMember.findFirst({
      where: { id: staffMemberId, userId },
      select: { id: true, name: true },
    });

    const deleted = await prisma.manufacturingTaskWorker
      .delete({
        where: {
          manufacturingTaskId_staffMemberId: {
            manufacturingTaskId: taskId,
            staffMemberId,
          },
        },
      })
      .catch(() => null);

    if (deleted && staff) {
      await prisma.manufacturingTaskActivity.create({
        data: {
          manufacturingTaskId: taskId,
          userId,
          type: 'WORKER_REMOVED',
          note: `${staff.name} removed`,
        },
      });
    }

    return deleted;
  },

  /** Soft-delete a task. */
  async softDelete(userId: string, id: string) {
    const task = await prisma.manufacturingTask.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });
    if (!task) throw Err.notFound('Task not found');

    return prisma.manufacturingTask.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  },

  /** Dashboard KPIs for the manufacturing tasks module. */
  async getDashboardKpis(userId: string) {
    const [pending, inProgress, onHold, doneToday, overdue] = await Promise.all([
      prisma.manufacturingTask.count({
        where: { userId, status: 'PENDING', deletedAt: null },
      }),
      prisma.manufacturingTask.count({
        where: { userId, status: 'IN_PROGRESS', deletedAt: null },
      }),
      prisma.manufacturingTask.count({
        where: { userId, status: 'ON_HOLD', deletedAt: null },
      }),
      prisma.manufacturingTask.count({
        where: {
          userId,
          status: 'DONE',
          deletedAt: null,
          completedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.manufacturingTask.count({
        where: {
          userId,
          deletedAt: null,
          status: { in: ['PENDING', 'IN_PROGRESS', 'ON_HOLD'] },
          plannedEndAt: { lt: new Date() },
        },
      }),
    ]);

    return { pending, inProgress, onHold, doneToday, overdue };
  },
};
