"use client";

import { useState } from "react";

/**
 * Tap-to-pick emoji field. Renders a curated grid of emojis as buttons; the
 * chosen one drives a hidden <input name=…> so it submits inside the
 * surrounding Server-Action <form> exactly like a normal field.
 *
 * Why curated (not the full Unicode set): picking a mate-avatar from ~30 fun
 * options beats scrolling 1,800, needs no library, and — crucially — works
 * the same on a phone and a desktop with no OS emoji keyboard (AGENTS.md:
 * keep it KISS). A small "type/paste your own" box is the escape hatch.
 */
const AVATARS = [
  "🍺", "🍻", "🥂", "🍷", "☕", "🌮",
  "🍕", "🦊", "🐻", "🐱", "🐶", "🐼",
  "🐧", "🦉", "🐙", "🦄", "🐝", "🐢",
  "😎", "🤠", "🥳", "👻", "🧙", "🦸",
  "🤖", "🎸", "⚽", "🎯", "🧭", "🚀",
];

export function EmojiPicker({
  name,
  defaultValue = "📍",
  allowEmpty = false,
  options = AVATARS,
}: {
  name: string;
  defaultValue?: string;
  allowEmpty?: boolean;
  options?: string[];
}) {
  const [value, setValue] = useState(defaultValue);

  // Keep a custom / previously-saved emoji visible and selected even when it
  // isn't one of the curated options.
  const custom = value !== "" && !options.includes(value);
  const cells = custom ? [value, ...options] : options;

  const cell = (active: boolean) =>
    `flex h-11 items-center justify-center rounded-lg leading-none transition ${
      active
        ? "ring-2 ring-[var(--amber)] bg-[var(--surface2)]"
        : "hover:bg-[var(--surface2)]"
    }`;

  return (
    <div>
      {/* The form submits this; the buttons below just drive its value. */}
      <input type="hidden" name={name} value={value} />
      <div
        className="grid grid-cols-6 gap-1.5"
        role="group"
        aria-label="Choose an emoji"
      >
        {allowEmpty && (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-pressed={value === ""}
            className={`${cell(value === "")} text-xs text-[var(--muted)]`}
          >
            None
          </button>
        )}
        {cells.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setValue(e)}
            aria-pressed={value === e}
            className={`${cell(value === e)} text-2xl`}
          >
            {e}
          </button>
        ))}
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
        or type / paste your own
        <input
          value={custom ? value : ""}
          onChange={(ev) => setValue(ev.target.value)}
          maxLength={8}
          placeholder="🙂"
          aria-label="Type or paste a custom emoji"
          className="input w-16 py-1 text-center text-base"
        />
      </label>
    </div>
  );
}
