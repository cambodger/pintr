"use client";

import { useState } from "react";

/**
 * "Share invite" button. Builds the /join/<code> link from the current origin
 * and fires the native share sheet (WhatsApp, Messages, …) on phones; on
 * desktop, where there's no share sheet, it copies the link to the clipboard
 * instead. The raw code is still shown alongside as a last-ditch fallback.
 */
export function InviteShare({
  code,
  groupName,
}: {
  code: string;
  groupName: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/join/${code}`;
    const text = `Get on pintr 🍺 so we know when we're in the same city for a pint. Tap to join ${groupName}:`;
    const nav = window.navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };

    if (nav.share) {
      try {
        await nav.share({ title: "pintr", text, url });
      } catch {
        // User dismissed the share sheet — nothing to do.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the raw code below still works.
    }
  }

  return (
    <button type="button" onClick={share} className="btn-amber w-full">
      {copied ? "Link copied ✓" : "📣 Share invite"}
    </button>
  );
}
