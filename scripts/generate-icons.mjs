// Icon generator for CashTraka PWA.
// Renders the new two-half circular logo (blue top, green bottom) into every
// PWA / favicon size the manifest + iOS Home Screen expect.
//
// Run with: node scripts/generate-icons.mjs
//
// Outputs committed to `public/`:
//   icon-192.png            (192×192, any)
//   icon-512.png            (512×512, any)
//   icon-maskable-512.png   (512×512, maskable — full-bleed with safe-zone padding)
//   apple-touch-icon.png    (180×180, iOS home screen)
//   favicon.ico             (32×32 PNG renamed, adequate for modern browsers)

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(ROOT, '..');
const PUBLIC = path.join(PROJECT, 'public');

/**
 * Standard logo-on-white tile. The paths here are a compact version of the
 * mark — two half-circles offset to create the S-twist. Keep in sync with
 * `public/icon.svg`, `src/app/icon.svg`, and `Logo.tsx`.
 */
const STANDARD_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">
  <rect width="64" height="64" rx="14" fill="#FFFFFF"/>
  <g transform="translate(10 6)">
    <path d="M 22,2 C 11.7,2 3,10.7 3,21 L 3,27 C 3,27 16,30 34,28 L 41,21 C 41,10.7 32.3,2 22,2 Z" fill="#00B8E8"/>
    <path d="M 22,50 C 32.3,50 41,41.3 41,31 L 41,25 C 41,25 28,22 10,24 L 3,31 C 3,41.3 11.7,50 22,50 Z" fill="#8BD91E"/>
  </g>
</svg>`;

/**
 * Maskable variant — full-bleed backdrop so Android doesn't clip into the
 * mark. The logo sits inside the inner ~60% "safe zone" (web manifest
 * maskable spec). Backdrop is the primary brand blue so the mark still reads
 * when cropped into a circle.
 */
const MASKABLE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
  <rect width="100" height="100" fill="#00B8E8"/>
  <g transform="translate(32 22)">
    <path d="M 18,0 C 9.5,0 2,7.5 2,16 L 2,21 C 2,21 12,24 27,22 L 33,16 C 33,7.5 26.5,0 18,0 Z" fill="#FFFFFF"/>
    <path d="M 18,40 C 26.5,40 33,32.5 33,24 L 33,19 C 33,19 23,16 8,18 L 2,24 C 2,32.5 9.5,40 18,40 Z" fill="#8BD91E"/>
  </g>
</svg>`;

async function ensureDir(d) {
  await fs.mkdir(d, { recursive: true });
}

async function renderPng(svg, size, outPath) {
  const buf = await sharp(Buffer.from(svg))
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  await fs.writeFile(outPath, buf);
  console.log('  wrote', path.relative(PROJECT, outPath), `(${buf.length} bytes)`);
}

async function main() {
  await ensureDir(PUBLIC);
  console.log('Generating PWA icons → public/');

  await renderPng(STANDARD_SVG, 192, path.join(PUBLIC, 'icon-192.png'));
  await renderPng(STANDARD_SVG, 512, path.join(PUBLIC, 'icon-512.png'));
  await renderPng(MASKABLE_SVG, 512, path.join(PUBLIC, 'icon-maskable-512.png'));
  await renderPng(STANDARD_SVG, 180, path.join(PUBLIC, 'apple-touch-icon.png'));

  // Favicon — a 32×32 PNG is fine for every modern browser; keep the .ico
  // extension so it's picked up by default rules.
  await renderPng(STANDARD_SVG, 32, path.join(PUBLIC, 'favicon.ico'));

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
