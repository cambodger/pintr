// PWA icon generator — the pintr pin-pint mark (neon-pink halo, amber pint) on a
// full-bleed navy tile. Re-run with `npm run icons`.
//
// Per the icon-standards research (see BRAND.md): icons are FULL-BLEED SQUARES
// with NO pre-rounded corners and NO transparency — iOS and Android/maskable
// apply their own mask. The maskable variant scales the mark to ~70% so it (and
// its halo) sit inside the 80% safe zone; the `any`/favicon renditions sit a
// little fuller. Pin geometry is settled — matches src/components/wordmark.tsx.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const PIN =
  "M256 84 C178 84 118 146 118 224 C118 314 200 380 256 456 C312 380 394 314 394 224 C394 146 334 84 256 84 Z";
const INNER =
  "M256 114 C190 114 148 168 148 224 C148 300 214 358 256 422 C298 358 364 300 364 224 C364 168 322 114 256 114 Z";
const FOAM =
  "M186 198 C183 168 210 158 227 170 C235 152 277 152 285 170 C302 158 329 168 326 198 Z";
const BEER =
  "M186 198 L326 198 C322 264 292 316 256 356 C220 316 190 264 186 198 Z";

// scale = size of the mark within the tile; the mark's visual centre (256,270)
// is recentred to the tile centre (256,256).
function icon({ scale }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="36%" r="85%">
      <stop offset="0" stop-color="#1b2150"/><stop offset="0.55" stop-color="#101537"/><stop offset="1" stop-color="#0a0e27"/>
    </radialGradient>
    <linearGradient id="beer" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fcd34d"/><stop offset="0.55" stop-color="#f59e0b"/><stop offset="1" stop-color="#b45309"/>
    </linearGradient>
    <linearGradient id="pink" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff5ba0"/><stop offset="1" stop-color="#ff2e88"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -270)">
    <g fill="none" stroke="#ff2e88" stroke-linejoin="round">
      <path d="${PIN}" stroke-width="60" stroke-opacity="0.10"/>
      <path d="${PIN}" stroke-width="36" stroke-opacity="0.16"/>
      <path d="${PIN}" stroke-width="18" stroke-opacity="0.26"/>
    </g>
    <path d="${PIN}" fill="url(#pink)"/>
    <path d="${INNER}" fill="#0a0e27"/>
    <path d="${FOAM}" fill="#fff7e6"/>
    <path d="${BEER}" fill="url(#beer)"/>
  </g>
</svg>`;
}

mkdirSync(join(root, "public", "icons"), { recursive: true });

const ANY = { scale: 0.86 };
const MASKABLE = { scale: 0.7 };

const targets = [
  ["public/icons/icon-192.png", 192, ANY],
  ["public/icons/icon-512.png", 512, ANY],
  ["public/icons/icon-512-maskable.png", 512, MASKABLE],
  ["public/apple-touch-icon.png", 180, ANY],
  ["src/app/icon.png", 64, ANY],
];

for (const [path, size, opts] of targets) {
  const png = await sharp(Buffer.from(icon(opts))).resize(size, size).png().toBuffer();
  writeFileSync(join(root, ...path.split("/")), png);
  console.log(`wrote ${path} (${size}x${size})`);
}
