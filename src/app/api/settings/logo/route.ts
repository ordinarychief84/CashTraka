import { requireUser } from '@/lib/auth';
import { userService } from '@/lib/services/user.service';
import { uploadLogo } from '@/lib/cloudinary/upload';
import { handled, ok, fail } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';

export const runtime = 'nodejs';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);

/**
 * POST /api/settings/logo
 *   multipart/form-data — field name: "file"
 *
 * Uploads to Cloudinary and stores the hosted URL on the user.
 */
export const POST = (req: Request) =>
  handled(async () => {
    const user = await requireUser();
    // Custom branding (logo on receipts/invoices) is a Plus-tier feature.
    const feature = requireFeature(user, 'customBranding');
    if (feature) return feature;
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return fail('Missing file', 400);
    if (!ALLOWED.has(file.type)) return fail('Only PNG, JPEG or WEBP', 415);
    if (file.size > MAX_BYTES) return fail('File must be under 2 MB', 413);

    const buffer = Buffer.from(await file.arrayBuffer());
    const format = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
    const result = await uploadLogo(user.id, buffer, format);
    if (!result) return fail('Image storage is not configured', 503);

    await userService.setLogoUrl(user.id, result.url);
    return ok({ logoUrl: result.url });
  });

/** DELETE /api/settings/logo — clear the stored logo URL. */
export const DELETE = () =>
  handled(async () => {
    const user = await requireUser();
    await userService.setLogoUrl(user.id, null);
    return ok({ logoUrl: null });
  });
