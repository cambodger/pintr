/** Display helpers. Timestamps arrive from Postgres as ISO strings (timestamptz). */

/** "…T10:00:00Z" → "just now" | "5m ago" | "3h ago" | "2d ago" | "Sat 14 Jun". */
export function timeAgo(iso: string): string {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days <= 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** ISO-3166 alpha-2 → flag emoji (regional-indicator pair). "GB" → 🇬🇧. */
export function flagEmoji(countryCode: string | null | undefined): string {
  if (!countryCode || countryCode.length !== 2) return "";
  const cc = countryCode.toUpperCase();
  if (cc === "XX") return "";
  const A = 0x1f1e6; // regional indicator 'A'
  const base = "A".charCodeAt(0);
  return String.fromCodePoint(
    A + (cc.charCodeAt(0) - base),
    A + (cc.charCodeAt(1) - base),
  );
}

/** "London" + "GB" → "London 🇬🇧". */
export function cityLabel(name: string, countryCode?: string | null): string {
  const flag = flagEmoji(countryCode);
  return flag ? `${name} ${flag}` : name;
}
