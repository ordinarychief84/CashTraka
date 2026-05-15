import { requireAuth } from '@/lib/auth';
import { handled, ok, fail } from '@/lib/api-response';
import { productionTemplatesService, type Cadence } from '@/lib/services/production-templates.service';

const CADENCES: Cadence[] = ['weekly', 'biweekly', 'monthly'];

/** GET /api/production-templates — list templates for the owner. */
export const GET = () =>
  handled(async () => {
    const auth = await requireAuth();
    const rows = await productionTemplatesService.listForUser(auth.owner.id);
    return ok(rows);
  });

/** POST /api/production-templates — create a new recurring rule. */
export const POST = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json().catch(() => ({}));

    const title = typeof body?.title === 'string' ? body.title : '';
    const cadence: Cadence = CADENCES.includes(body?.cadence) ? body.cadence : 'weekly';
    const dayOfWeek =
      typeof body?.dayOfWeek === 'number' ? body.dayOfWeek : null;
    const dayOfMonth =
      typeof body?.dayOfMonth === 'number' ? body.dayOfMonth : null;
    const hourOfDay = typeof body?.hourOfDay === 'number' ? body.hourOfDay : 9;
    const notes = typeof body?.notes === 'string' ? body.notes : null;
    const items = Array.isArray(body?.items)
      ? body.items
          .filter(
            (it: any) =>
              it && typeof it.productId === 'string' && Number.isFinite(it.quantity) && it.quantity > 0,
          )
          .map((it: any) => ({ productId: it.productId, quantity: Number(it.quantity) }))
      : [];

    if (items.length === 0) {
      return fail('Add at least one product to the template.', 400);
    }

    const created = await productionTemplatesService.create(auth.owner.id, {
      title,
      cadence,
      dayOfWeek,
      dayOfMonth,
      hourOfDay,
      notes,
      items,
    });
    return ok({ id: created.id });
  });
