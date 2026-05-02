/**
 * Uploadcare storage wrapper — drop-in replacement for the previous Cloudinary
 * module. Exposes the same two functions (`uploadLogo`, `uploadPdf`) returning
 * the same `{ url, publicId }` shape, so callers don't change.
 *
 * Uses Uploadcare's public upload endpoint (multipart/form-data POST to
 * https://upload.uploadcare.com/base/). Only the **public key** is required
 * for uploads themselves. Files are served from `https://ucarecdn.com/<uuid>/`.
 *
 * ⚠ IMPORTANT — files MUST be "stored" to appear on the CDN ⚠
 *
 * Uploadcare uploads go into a temporary staging area. Before they show up
 * publicly on the CDN, they need to be "stored". Two ways to do this:
 *
 *   A) Dashboard toggle (free): Project Settings → API → "Automatic storing"
 *      → ON. Zero code. Recommended for most setups.
 *
 *   B) Secret key in env: if UPLOADCARE_SECRET_KEY is set, this module will
 *      call PUT /files/<uuid>/storage/ right after each upload to store the
 *      file explicitly. Use this when you can't toggle the project setting.
 *
 * Without either, uploads succeed and return a UUID, but the CDN returns
 * 404 for the file and it expires after 24h.
 *
 * Env:
 *   UPLOADCARE_PUBLIC_KEY   (required)
 *   UPLOADCARE_SECRET_KEY   (optional — enables the "explicit store" path B)
 *
 * All uploads are resilient: if UPLOADCARE_PUBLIC_KEY is unset, functions
 * return `null` instead of throwing, matching the old behaviour so callers
 * keep their graceful-degradation paths.
 */

const UPLOAD_ENDPOINT = 'https://upload.uploadcare.com/base/';
const REST_BASE = 'https://api.uploadcare.com';

/**
 * Public delivery domain for the project's files.
 *
 * Newer Uploadcare projects ship with a project-specific subdomain
 * (e.g. https://5jowdl24z8.ucarecd.net) shown on the file detail page in
 * the dashboard. Older / legacy projects share https://ucarecdn.com.
 * Files only resolve via the project's assigned domain — using the wrong
 * one returns 404.
 *
 * We read it from UPLOADCARE_CDN_BASE so each environment can point at the
 * right host, and fall back to ucarecdn.com for legacy compatibility.
 */
function cdnBase(): string {
  const env = process.env.UPLOADCARE_CDN_BASE?.trim();
  if (env) return env.replace(/\/$/, '');
  return 'https://ucarecdn.com';
}

type UploadResult = { url: string; publicId: string };

function isConfigured(): boolean {
  return Boolean(process.env.UPLOADCARE_PUBLIC_KEY);
}

/**
 * Explicitly store a freshly-uploaded file via the Uploadcare REST API so it
 * becomes available on the public CDN. Only runs when both the public + secret
 * keys are present; otherwise we assume the project has auto-store enabled.
 */
async function storeFile(uuid: string): Promise<boolean> {
  const pub = process.env.UPLOADCARE_PUBLIC_KEY;
  const sec = process.env.UPLOADCARE_SECRET_KEY;
  if (!pub || !sec) return true; // nothing to do — assume project auto-stores
  try {
    const res = await fetch(`${REST_BASE}/files/${uuid}/storage/`, {
      method: 'PUT',
      headers: {
        Authorization: `Uploadcare.Simple ${pub}:${sec}`,
        Accept: 'application/vnd.uploadcare-v0.7+json',
      },
    });
    return res.ok;
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Uploadcare store error', e);
    }
    return false;
  }
}

/**
 * POST the buffer to Uploadcare's anonymous upload endpoint.
 *
 * `UPLOADCARE_STORE: '1'` forces the file to be permanently stored on the
 * public CDN at upload time, regardless of the project-level default. This
 * is the safe choice: with 'auto' a project set to "Manual" storage would
 * accept the upload but never publish it, leaving the URL as a broken
 * image. `'1'` always works.
 *
 * If UPLOADCARE_SECRET_KEY is also configured, storeFile() runs as a
 * belt-and-suspenders explicit store via REST after the upload.
 */
/**
 * Specific error thrown when the upload succeeds but the file never
 * reaches the public CDN. Almost always means the Uploadcare project
 * has auto-store turned off AND no UPLOADCARE_SECRET_KEY is configured
 * to do explicit REST storage.
 */
export class UploadNotStoredError extends Error {
  cdnStatus?: number;
  uploadcareUuid: string;
  constructor(uuid: string, cdnStatus?: number) {
    super('Uploadcare file is not on the public CDN.');
    this.name = 'UploadNotStoredError';
    this.uploadcareUuid = uuid;
    this.cdnStatus = cdnStatus;
  }
}

async function uploadBuffer(
  buffer: Buffer,
  opts: { folder: string; publicId: string; mime: string; filename: string },
): Promise<UploadResult | null> {
  const pubKey = process.env.UPLOADCARE_PUBLIC_KEY;
  if (!pubKey) return null;

  const form = new FormData();
  form.append('UPLOADCARE_PUB_KEY', pubKey);
  form.append('UPLOADCARE_STORE', '1');
  form.append(
    'file',
    new Blob([new Uint8Array(buffer)], { type: opts.mime }),
    opts.filename,
  );

  let json: { file?: string };
  try {
    const res = await fetch(UPLOAD_ENDPOINT, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      if (process.env.NODE_ENV !== 'production') {
        const text = await res.text().catch(() => '');
        console.warn('Uploadcare upload failed', res.status, text);
      }
      return null;
    }
    json = (await res.json()) as { file?: string };
    if (!json.file) return null;
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Uploadcare upload error', e);
    }
    return null;
  }

  // Best-effort explicit store for projects where auto-store is off.
  // No-op when UPLOADCARE_SECRET_KEY is not set.
  await storeFile(json.file);

  const url = `${cdnBase()}/${json.file}/${encodeURIComponent(opts.filename)}`;

  // Verify the file is reachable. If the project's auto-store is "Manual"
  // and we have no secret key, the upload returns a UUID but the CDN serves
  // 404. We throw a typed error so the API route can surface a clear,
  // actionable message instead of silently returning a broken URL.
  try {
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok) {
      throw new UploadNotStoredError(json.file, head.status);
    }
  } catch (e) {
    if (e instanceof UploadNotStoredError) throw e;
    // Network blip on the HEAD; trust the upload and let the caller render.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Uploadcare HEAD check error (non-fatal)', e);
    }
  }

  return { url, publicId: json.file };
}

function imageMime(format: string): string {
  const f = format.toLowerCase();
  if (f === 'jpg' || f === 'jpeg') return 'image/jpeg';
  if (f === 'webp') return 'image/webp';
  if (f === 'gif') return 'image/gif';
  if (f === 'svg') return 'image/svg+xml';
  return 'image/png';
}

/** Upload a business logo (png/jpg/webp). Returns hosted URL. */
export function uploadLogo(
  userId: string,
  buffer: Buffer,
  format: string,
): Promise<UploadResult | null> {
  return uploadBuffer(buffer, {
    folder: 'cashtraka/logos',
    publicId: userId,
    mime: imageMime(format),
    filename: `logo.${format}`,
  });
}

/**
 * Upload a generic catalog/album image. Filename collisions are avoided by
 * suffixing with a short timestamp+random token so two different products
 * can share the same source filename without clobbering.
 */
export function uploadImage(
  userId: string,
  buffer: Buffer,
  format: string,
  originalName?: string,
): Promise<UploadResult | null> {
  const stamp =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const safeBase = (originalName || 'image')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/\.[^.]+$/, '')
    .slice(0, 40) || 'image';
  return uploadBuffer(buffer, {
    folder: `cashtraka/showroom/${userId}`,
    publicId: `${safeBase}-${stamp}`,
    mime: imageMime(format),
    filename: `${safeBase}-${stamp}.${format}`,
  });
}

/** Upload a receipt PDF. Returns hosted URL. */
export function uploadPdf(
  buffer: Buffer,
  opts: { folder: string; publicId: string },
): Promise<UploadResult | null> {
  return uploadBuffer(buffer, {
    folder: opts.folder,
    publicId: opts.publicId,
    mime: 'application/pdf',
    filename: `${opts.publicId}.pdf`,
  });
}
