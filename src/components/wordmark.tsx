import type { CSSProperties } from "react";

// pintr brand mark + wordmark — see BRAND.md. The pin keeps its pink halo; the
// wordmark TYPE is always clean (no glow). Solid fills here (crisp at UI sizes);
// the richer gradient + full halo rendition lives in scripts/generate-icons.mjs.
// Pin geometry is settled — do not change these paths.

const PIN =
  "M256 84 C178 84 118 146 118 224 C118 314 200 380 256 456 C312 380 394 314 394 224 C394 146 334 84 256 84 Z";
const INNER =
  "M256 114 C190 114 148 168 148 224 C148 300 214 358 256 422 C298 358 364 300 364 224 C364 168 322 114 256 114 Z";
const FOAM =
  "M186 198 C183 168 210 158 227 170 C235 152 277 152 285 170 C302 158 329 168 326 198 Z";
const BEER =
  "M186 198 L326 198 C322 264 292 316 256 356 C220 316 190 264 186 198 Z";

/** The pin glyph (transparent background, solid fills, subtle pink halo). */
export function Mark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg
      height={size}
      viewBox="76 48 360 452"
      fill="none"
      role="img"
      aria-label="pintr"
      className={className}
      style={{ width: "auto", display: "block" }}
    >
      <g stroke="#ff2e88" strokeLinejoin="round">
        <path d={PIN} strokeWidth={60} strokeOpacity={0.1} />
        <path d={PIN} strokeWidth={36} strokeOpacity={0.16} />
        <path d={PIN} strokeWidth={18} strokeOpacity={0.26} />
      </g>
      <path d={PIN} fill="#ff2e88" />
      <path d={INNER} fill="#0a0e27" />
      <path d={FOAM} fill="#fff7e6" />
      <path d={BEER} fill="#f59e0b" />
    </svg>
  );
}

/**
 * The full lockup: mark + clean `pintr` wordmark. `tone="light"` switches the
 * `pint` from amber to foam-white for amber/low-contrast surfaces.
 */
export function Wordmark({
  height = 30,
  tone = "amber",
  className,
}: {
  height?: number;
  tone?: "amber" | "light";
  className?: string;
}) {
  const word = tone === "amber" ? "#f59e0b" : "#fff7e6";
  return (
    <span
      className={`inline-flex items-center font-extrabold tracking-tight leading-none ${className ?? ""}`}
      style={{ fontSize: `${height}px`, gap: `${Math.round(height * 0.24)}px` } as CSSProperties}
    >
      <Mark size={Math.round(height * 1.2)} />
      <span style={{ color: word }}>
        pint<span style={{ color: "#ff2e88" }}>r</span>
      </span>
    </span>
  );
}
