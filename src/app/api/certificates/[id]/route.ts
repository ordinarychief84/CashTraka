import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { handled, ok, validationFail } from '@/lib/api-response';
import { certificatesService } from '@/lib/services/certificates.service';

export const runtime = 'nodejs';

const patchSchema = z.object({
  kind: z.string().min(1).max(32).optional(),
  label: z.string().min(1).max(200).optional(),
  productId: z.string().optional().nullable(),
  certificateNumber: z.string().max(120).optional().nullable(),
  issuedAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const GET = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const cert = await certificatesService.getForUser(user.id, ctx.params.id);
    return ok(cert);
  });

export const PATCH = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const updated = await certificatesService.update(user.id, ctx.params.id, {
      kind: parsed.data.kind,
      label: parsed.data.label,
      productId: parsed.data.productId,
      certificateNumber: parsed.data.certificateNumber,
      issuedAt: parsed.data.issuedAt ? new Date(parsed.data.issuedAt) : null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      notes: parsed.data.notes,
      // file is replaced via the upload route only
      fileUrl: undefined as any,
    } as any);
    return ok(updated);
  });

export const DELETE = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    await certificatesService.softDelete(user.id, ctx.params.id);
    return ok({ ok: true });
  });
