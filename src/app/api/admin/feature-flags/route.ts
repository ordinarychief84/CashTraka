import { z } from 'zod';
import { requireAdminOrStaff } from '@/lib/auth';
import { handled, ok, validationFail } from '@/lib/api-response';
import {
  FEATURE_FLAGS,
  getAllFlagValues,
  setFeatureFlag,
  type FeatureFlagKey,
} from '@/lib/feature-flags';
import { prisma } from '@/lib/prisma';
import { adminCan } from '@/lib/admin-rbac';

const schema = z.object({
  key: z.string().min(1),
  value: z.boolean(),
});

/** GET — return the current flag values. */
export const GET = () =>
  handled(async () => {
    const admin = await requireAdminOrStaff();
    if (!adminCan(admin.adminRole as any, 'flags')) {
      return ok({ flags: {}, defs: [] }, 403);
    }
    const flags = await getAllFlagValues();
    return ok({ flags, defs: FEATURE_FLAGS });
  });

/** PATCH — toggle one flag. Logs the change so it's visible in audit. */
export const PATCH = (req: Request) =>
  handled(async () => {
    const admin = await requireAdminOrStaff();
    if (!adminCan(admin.adminRole as any, 'flags')) {
      return ok({ error: 'forbidden' }, 403);
    }
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const validKeys = new Set(FEATURE_FLAGS.map((f) => f.key as string));
    if (!validKeys.has(parsed.data.key)) {
      return ok({ error: 'unknown flag' }, 422);
    }

    await setFeatureFlag(parsed.data.key as FeatureFlagKey, parsed.data.value);

    // AuditLog.adminId is a FK into User — only super_admin (a User row)
    // can populate it. Skip for admin_staff to avoid an FK violation; the
    // SystemSetting row itself carries `updatedAt` so the change isn't lost.
    if (admin.kind === 'super_admin') {
      await prisma.auditLog.create({
        data: {
          adminId: admin.id,
          action: 'feature_flag.update',
          targetId: parsed.data.key,
          details: JSON.stringify({ value: parsed.data.value }),
        },
      }).catch(() => {});
    }

    return ok({ key: parsed.data.key, value: parsed.data.value });
  });
