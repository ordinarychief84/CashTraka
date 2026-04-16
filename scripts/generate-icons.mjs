// Icon generator for CashTraka PWA.
// Reads the brand SVG (deep-green rounded square + white check) and rasterises
// it to the sizes required by manifest + iOS + favicon.
//
// Run with: node scripts/generate-icons.mjs
//
// Outputs committed to `public/`:
//   icon-192.png            (192×192, any)
//   icon-512.png            (512×512, any)
//   icon-maskable-512.png   (512×512, maskable — full-bleed green with safe-zone padding)
//   apple-touch-icon.png    (180×180, iOS home screen)
//   favicon.ico             (32×32 PNG renamed, adequate for modern browsers)

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(ROOT, '..');
const PUBLIC = path.join(PROJECT, 'public');

// The standard icon (used for 192/512/apple/favicon): the existing brand SVG.
const STANDARD_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">
  <rect width="64" height="64" rx="14" fill="#0F6F4F"/>
  <path d="M16 33.5 l10 10 L48 20" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// The maskable variant: full-bleed deep green with the check centered in the
// inner 60% "safe zone" (per Web App Manifest maskable spec). Android will clip
// the edges with its circular/squircle mask; we want the glyph untouched.
const MASKABLE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
  <rect width="100" height="100" fill="#0F6F4F"/>
  <path d="M30 52 l13 13 L72 30" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
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
