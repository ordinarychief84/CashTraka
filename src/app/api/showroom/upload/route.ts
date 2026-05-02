import { requireUser } from '@/lib/auth';
import { handled, ok, fail } from '@/lib/api-response';
import { uploadImage, UploadNotStoredError } from '@/lib/uploadcare/upload';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per file
const MAX_FILES = 8;
const ALLOWED = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

/**
 * POST /api/showroom/upload, multipart/form-data, field "files" (one or many).
 *
 * Streams each image to Uploadcare and returns the hosted URLs in the same
 * order they were submitted. Used by the catalog (product images) and the
 * album editor (cover image).
 *
 * Why server-side instead of direct browser → Uploadcare:
 *   - Keeps UPLOADCARE_PUBLIC_KEY off the client (one less surface).
 *   - Centralises size + mime checks so the client can't bypass them.
 *   - Lets us add per-user rate limits later without changing the widget.
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

    const files = form.getAll('files').filter((f): f is File => f instanceof File);
    if (files.length === 0) return fail('No files', 400);
    if (files.length > MAX_FILES) {
      return fail(`Too many files (max ${MAX_FILES})`, 413);
    }

    const results: Array<{ url: string; publicId: string }> = [];
    for (const file of files) {
      if (!ALLOWED.has(file.type)) {
        return fail(`Unsupported type ${file.type}. Use PNG, JPEG, WEBP or GIF.`, 415);
      }
      if (file.size > MAX_BYTES) {
        return fail(`"${file.name}" exceeds 5 MB`, 413);
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const format = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
      try {
        const result = await uploadImage(user.id, buffer, format, file.name);
        if (!result) {
          return fail('Image storage is not configured', 503);
        }
        results.push(result);
      } catch (e) {
        if (e instanceof UploadNotStoredError) {
          // Specific, actionable message: tells the operator exactly what to fix.
          return fail(
            'Image upload reached Uploadcare but the file is not on the public CDN. ' +
              'Enable auto-store in your Uploadcare project (Project Settings, API, ' +
              'Automatic file storing, ON) or set UPLOADCARE_SECRET_KEY in your env.',
            502,
          );
        }
        throw e;
      }
    }

    return ok({ files: results });
  });
