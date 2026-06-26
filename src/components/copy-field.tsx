"use client";

import { useState } from "react";

/**
 * Read-only value with a copy button. Client Component because clipboard
 * access (navigator.clipboard) only exists in the browser, and the
 * "Copied" feedback is local UI state.
 */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (permissions, http origin); selecting the
      // text manually still works, so no error UI needed.
    }
  }

  return (
    <div className="flex items-stretch gap-2">
      <input
        readOnly
        aria-label={label}
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--navy2)] px-3 py-2 font-mono text-xs text-[var(--muted)]"
      />
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-lg border border-[var(--line)] px-3 text-sm font-medium hover:bg-white/5"
      >
        {copied ? "Nicked ✓" : "Nick it"}
      </button>
    </div>
  );
}
