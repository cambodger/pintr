// PWA icon generator — a white map pin on an amber gradient ("pintr": pin +
// pint). Re-run with `npm run icons` (or `node scripts/generate-icons.mjs`).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The artwork is one 512×512 SVG. `pad` shrinks the glyph towards the centre
 * for maskable icons, whose outer ~10% can be cropped to any shape.
 */
function svg({ pad = 0 } = {}) {
  const s = 1 - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f59e0b"/>
      <stop offset="1" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${pad > 0 ? 0 : 96}" fill="url(#bg)"/>
  <g transform="translate(${512 * pad} ${512 * pad}) scale(${s})">
    <!-- map pin teardrop -->
    <path d="M256 92
             c 66 0 120 54 120 120
             c 0 90 -120 208 -120 208
             c 0 0 -120 -118 -120 -208
             c 0 -66 54 -120 120 -120 z" fill="#ffffff"/>
    <!-- hole punched through to the gradient, with a little frothy head on top -->
    <circle cx="256" cy="208" r="46" fill="url(#bg)"/>
    <path d="M232 196
             a 14 14 0 0 1 14 -14
             a 16 16 0 0 1 30 4
             a 12 12 0 0 1 -2 24
             h -30
             a 12 12 0 0 1 -12 -14 z" fill="#ffffff"/>
  </g>
</svg>`;
}

mkdirSync(join(root, "public", "icons"), { recursive: true });

const targets = [
  ["public/icons/icon-192.png", 192, {}],
  ["public/icons/icon-512.png", 512, {}],
  // Maskable: full-bleed background, glyph pulled into the safe zone.
  ["public/icons/icon-512-maskable.png", 512, { pad: 0.1 }],
  ["public/apple-touch-icon.png", 180, {}],
  // src/app/icon.png is picked up by Next.js as the favicon automatically.
  ["src/app/icon.png", 64, {}],
];

for (const [path, size, opts] of targets) {
  const png = await sharp(Buffer.from(svg(opts)))
    .resize(size, size)
    .png()
    .toBuffer();
  writeFileSync(join(root, ...path.split("/")), png);
  console.log(`wrote ${path} (${size}x${size})`);
}
