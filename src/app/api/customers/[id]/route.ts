import { requireUser } from '@/lib/auth';
import { customerService } from '@/lib/services/customer.service';
import { prisma } from '@/lib/prisma';
import { handled, ok, fail } from '@/lib/api-response';

/** GET /api/customers/[id], customer profile + recent payments + debts. */
export const GET = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const detail = await customerService.detailForUser(user.id, ctx.params.id);
    return ok(detail);
  });

/** PATCH /api/customers/[id], update customer profile fields. */
export const PATCH = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const body = await req.json();
    const update: Record<string, unknown> = {};
    if (body.notes !== undefined) update.notes = body.notes;
    if (body.tags !== undefined) update.tags = body.tags;
    if (body.name !== undefined) update.name = (body.name as string).trim();
    if (body.phone !== undefined) update.phone = body.phone;
    if (body.address !== undefined) update.address = body.address || null;
    if (body.email !== undefined) update.email = body.email || null;
    if (body.city !== undefined) update.city = body.city || null;
    if (body.state !== undefined) update.state = body.state || null;
    if (body.country !== undefined) update.country = body.country || null;
    if (body.postalCode !== undefined) update.postalCode = body.postalCode || null;
    if (body.webPage !== undefined) update.webPage = body.webPage || null;
    if (body.taxId !== undefined) update.taxId = body.taxId || null;

    const customer = await prisma.customer.updateMany({
      where: { id: ctx.params.id, userId: user.id },
      data: update,
    });
    if (customer.count === 0) {
      return fail('Customer not found', 404);
    }
    const updated = await prisma.customer.findFirst({ where: { id: ctx.params.id, userId: user.id } });
    return ok(updated);
  });
