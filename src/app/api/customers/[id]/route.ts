import { requireUser } from '@/lib/auth';
import { customerService } from '@/lib/services/customer.service';
import { prisma } from '@/lib/prisma';
import { handled, ok } from '@/lib/api-response';

/** GET /api/customers/[id] — customer profile + recent payments + debts. */
export const GET = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const detail = await customerService.detailForUser(user.id, ctx.params.id);
    return ok(detail);
  });

/** PATCH /api/customers/[id] — update customer notes and tags. */
export const PATCH = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const body = await req.json();
    const update: Record<string, unknown> = {};
    if (body.notes !== undefined) update.notes = body.notes;
    if (body.tags !== undefined) update.tags = body.tags;
    if (body.name !== undefined) update.name = body.name;
    if (body.phone !== undefined) update.phone = body.phone;

    const customer = await prisma.customer.updateMany({
      where: { id: ctx.params.id, userId: user.id },
      data: update,
    });
    if (customer.count === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Customer not found' }), { status: 404 });
    }
    const updated = await prisma.customer.findFirst({ where: { id: ctx.params.id, userId: user.id } });
    return ok(updated);
  });
