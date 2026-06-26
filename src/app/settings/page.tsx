import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toggleGhost, updateProfile, updateStatus } from "./actions";

export const metadata: Metadata = { title: "Settings" };

const STATUS_MESSAGES: Record<string, { tone: "ok" | "error"; text: string }> =
  {
    saved: { tone: "ok", text: "Profile saved." },
    status_saved: { tone: "ok", text: "Status updated." },
    ghost_saved: { tone: "ok", text: "Visibility updated." },
    invalid_name: {
      tone: "error",
      text: "Your name needs to be 1 to 80 characters.",
    },
    failed: { tone: "error", text: "Something went wrong. Try again." },
  };

const inputClass = "input";
const buttonClass = "btn-amber";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("members")
    .select("display_name, pin_emoji, status_text, status_emoji, ghost_mode")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) redirect("/onboarding");

  const message = status ? STATUS_MESSAGES[status] : undefined;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--amber)]">
          Settings
        </h1>
        <Link
          href="/"
          className="text-sm link"
        >
          Back
        </Link>
      </header>

      {message && (
        <p
          role="status"
          className={`mt-4 banner text-sm ${
            message.tone === "ok" ? "banner-ok" : "banner-bad"
          }`}
        >
          {message.text}
        </p>
      )}

      <section className="mt-6 card p-4">
        <h2 className="font-semibold">Profile</h2>
        <form action={updateProfile} className="mt-3 flex flex-col gap-3">
          <label htmlFor="display_name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="display_name"
            name="display_name"
            required
            maxLength={80}
            defaultValue={me.display_name}
            className={inputClass}
          />
          <label htmlFor="pin_emoji" className="text-sm font-medium">
            Pin emoji
          </label>
          <input
            id="pin_emoji"
            name="pin_emoji"
            maxLength={16}
            defaultValue={me.pin_emoji}
            className={inputClass}
          />
          <button type="submit" className={buttonClass}>
            Save profile
          </button>
        </form>
      </section>

      <section className="mt-4 card p-4">
        <h2 className="font-semibold">Status</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          A line shown next to your pin. Leave blank to clear it.
        </p>
        <form action={updateStatus} className="mt-3 flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              name="status_emoji"
              maxLength={16}
              defaultValue={me.status_emoji ?? ""}
              placeholder="🍺"
              className={`${inputClass} w-16 text-center`}
            />
            <input
              name="status_text"
              maxLength={140}
              defaultValue={me.status_text ?? ""}
              placeholder="free tonight, who's about?"
              className={`${inputClass} flex-1`}
            />
          </div>
          <button type="submit" className={buttonClass}>
            Save status
          </button>
        </form>
      </section>

      <section className="mt-4 card p-4">
        <h2 className="font-semibold">Visibility</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {me.ghost_mode
            ? "You're invisible — no one can see where you are."
            : "You're visible to your groups."}
        </p>
        <form action={toggleGhost} className="mt-3">
          <input
            type="hidden"
            name="ghost"
            value={me.ghost_mode ? "false" : "true"}
          />
          <button
            type="submit"
            className={me.ghost_mode ? "btn-amber" : "btn-ghost"}
          >
            {me.ghost_mode ? "Come back online" : "👻 Go invisible"}
          </button>
        </form>
      </section>
    </main>
  );
}
