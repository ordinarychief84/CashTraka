import { v2 as cloudinary } from 'cloudinary';

/**
 * Cloudinary wrapper. All uploads are resilient: if CLOUDINARY_URL (or the
 * separate cloud name/key/secret vars) are unset, upload functions return
 * `null` instead of throwing, so callers can degrade gracefully.
 *
 * Configure for production by setting either:
 *   CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud_name>
 * OR
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

function isConfigured(): boolean {
  if (process.env.CLOUDINARY_URL) return true;
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

function ensureConfigured(): boolean {
  if (!isConfigured()) return false;
  // SDK honors CLOUDINARY_URL automatically; if separate vars are set, wire them.
  if (!process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
  return true;
}

type UploadResult = { url: string; publicId: string };

async function uploadBuffer(
  buffer: Buffer,
  opts: {
    folder: string;
    publicId?: string;
    resourceType: 'image' | 'raw' | 'auto';
    format?: string;
  },
): Promise<UploadResult | null> {
  if (!ensureConfigured()) return null;
  return new Promise<UploadResult | null>((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: opts.folder,
        public_id: opts.publicId,
        resource_type: opts.resourceType,
        format: opts.format,
        overwrite: true,
      },
      (err, result) => {
        if (err || !result) {
          if (process.env.NODE_ENV !== 'production') console.warn('Cloudinary upload error', err);
          return resolve(null);
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    uploadStream.end(buffer);
  });
}

/** Upload a business logo (png/jpg/webp). Returns hosted URL. */
export function uploadLogo(
  userId: string,
  buffer: Buffer,
  format: string,
): Promise<UploadResult | null> {
  return uploadBuffer(buffer, {
    folder: `cashtraka/logos`,
    publicId: userId,
    resourceType: 'image',
    format,
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
    resourceType: 'raw',
    format: 'pdf',
  });
}
