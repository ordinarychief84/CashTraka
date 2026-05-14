import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { handled, ok, fail, validationFail } from '@/lib/api-response';
import {
  uploadImage,
  uploadPdf,
  UploadNotStoredError,
} from '@/lib/uploadcare/upload';
import { certificatesService } from '@/lib/services/certificates.service';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — certs are PDFs, scans can be hefty
const ALLOWED = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const metaSchema = z.object({
  kind: z.string().min(1).max(32),
  label: z.string().min(1).max(200),
  productId: z.string().optional().nullable(),
  certificateNumber: z.string().max(120).optional().nullable(),
  issuedAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

/**
 * GET /api/certificates
 * Lists every certificate the current user owns (not soft-deleted).
 */
export const GET = () =>
  handled(async () => {
    const user = await requireUser();
    const rows = await certificatesService.listForUser(user.id);
    return ok({ rows });
  });

/**
 * POST /api/certificates, multipart/form-data
 *   field "file"  the PDF or image of the cert
 *   field "meta"  JSON-encoded metaSchema
 *
 * Streams the file to Uploadcare, then creates the Certificate row.
 */
export const POST = (req: Request) =>
  handled(async () => {
    const user = await requireUser();

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return fail('Expected multipart/form-data', 400);
    }

    const file = form.get('file');
    if (!(file instanceof File)) return fail('Missing file', 400);
    if (!ALLOWED.has(file.type)) {
      return fail(`Unsupported type ${file.type}. Use PDF, PNG, JPEG, or WEBP.`, 415);
    }
    if (file.size > MAX_BYTES) {
      return fail('File exceeds 10 MB', 413);
    }

    const metaRaw = form.get('meta');
    if (typeof metaRaw !== 'string') return fail('Missing meta', 400);
    let meta: z.infer<typeof metaSchema>;
    try {
      const parsed = metaSchema.safeParse(JSON.parse(metaRaw));
      if (!parsed.success) return validationFail(parsed.error);
      meta = parsed.data;
    } catch {
      return fail('Invalid meta JSON', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let hosted: { url: string } | null;
    try {
      if (file.type === 'application/pdf') {
        hosted = await uploadPdf(buffer, {
          folder: `cashtraka/certificates/${user.id}`,
          publicId: `cert-${Date.now().toString(36)}`,
        });
      } else {
        const format = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
        hosted = await uploadImage(user.id, buffer, format, file.name);
      }
    } catch (e) {
      if (e instanceof UploadNotStoredError) {
        return fail(
          'File reached Uploadcare but is not on the public CDN. Enable auto-store on the project or set UPLOADCARE_SECRET_KEY.',
          502,
        );
      }
      throw e;
    }
    if (!hosted) return fail('Storage not configured', 503);

    const cert = await certificatesService.create(user.id, {
      kind: meta.kind,
      label: meta.label,
      productId: meta.productId || null,
      certificateNumber: meta.certificateNumber || null,
      issuedAt: meta.issuedAt ? new Date(meta.issuedAt) : null,
      expiresAt: meta.expiresAt ? new Date(meta.expiresAt) : null,
      notes: meta.notes || null,
      fileUrl: hosted.url,
      mimeType: file.type,
    });

    return ok({ certificate: cert });
  });
