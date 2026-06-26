import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createGroup, joinGroup, saveProfile } from "./actions";

export const metadata: Metadata = { title: "Get set up" };

const STATUS_MESSAGES: Record<string, { tone: "ok" | "error"; text: string }> =
  {
    profile_saved: {
      tone: "ok",
      text: "You're on the map — now join your mates or start a group.",
    },
    invalid_name: {
      tone: "error",
      text: "Your name needs to be between 1 and 80 characters.",
    },
    invalid_group: {
      tone: "error",
      text: "Group names need to be between 1 and 80 characters.",
    },
    bad_invite_code: {
      tone: "error",
      text: "That invite code isn't right — check it with whoever shared it.",
    },
    rpc_failed: {
      tone: "error",
      text: "Something went wrong. Try again in a minute.",
    },
  };

function StatusBanner({ status }: { status?: string }) {
  const message = status ? STATUS_MESSAGES[status] : undefined;
  if (!message) return null;
  return (
    <p
      role="status"
      className={`mt-4 banner ${
        message.tone === "ok" ? "banner-ok" : "banner-bad"
      }`}
    >
      {message.text}
    </p>
  );
}

const inputClass = "input";
const buttonClass = "mt-1 btn-amber";

/**
 * Two-step onboarding. The step isn't stored — it's derived from the database
 * each render (do you have a member row? a group?), so refreshes and retries
 * land on the right screen.
 */
export default async function OnboardingPage({
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
    .select("id, display_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // ----- Step 1: no profile yet ----------------------------------------
  if (!me) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--amber)]">
          Welcome to pintr
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          First, how should you show up on the map?
        </p>
        <StatusBanner status={status} />

        <section className="mt-8 card p-4">
          <form action={saveProfile} className="flex flex-col gap-3">
            <label htmlFor="display_name" className="text-sm font-medium">
              Your name
            </label>
            <input
              id="display_name"
              name="display_name"
              required
              maxLength={80}
              placeholder="Andy"
              className={inputClass}
            />
            <label htmlFor="pin_emoji" className="text-sm font-medium">
              Your pin emoji
            </label>
            <input
              id="pin_emoji"
              name="pin_emoji"
              maxLength={16}
              defaultValue="📍"
              className={inputClass}
            />
            <p className="text-xs text-[var(--muted)]">
              This is your marker on the map. Try 🍺 🧭 🐙 🎯 🦊 🌮 — paste any
              emoji you like.
            </p>
            <button type="submit" className={buttonClass}>
              Save and continue
            </button>
          </form>
        </section>
      </main>
    );
  }

  // ----- Already in a group? Onboarding is done. -----------------------
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .is("left_at", null);

  if (memberships && memberships.length > 0) {
    redirect("/");
  }

  // ----- Step 2: profile exists, no group yet --------------------------
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--amber)]">
        Nearly there, {me.display_name}
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        A group is your circle of mates. Start one and share the code, or join
        with a code someone sent you.
      </p>
      <StatusBanner status={status} />

      <section className="mt-8 card p-4">
        <h2 className="font-semibold">Start a group</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          You&apos;ll get an invite code to share.
        </p>
        <form action={createGroup} className="mt-3 flex flex-col gap-3">
          <label htmlFor="group_name" className="text-sm font-medium">
            Group name
          </label>
          <input
            id="group_name"
            name="group_name"
            required
            maxLength={80}
            placeholder="The Usual Suspects"
            className={inputClass}
          />
          <button type="submit" className={buttonClass}>
            Create group
          </button>
        </form>
      </section>

      <div className="mt-6 text-center text-sm text-[var(--muted)]">— or —</div>

      <section className="mt-6 card p-4">
        <h2 className="font-semibold">Join a group</h2>
        <form action={joinGroup} className="mt-3 flex flex-col gap-3">
          <label htmlFor="invite_code" className="text-sm font-medium">
            Invite code
          </label>
          <input
            id="invite_code"
            name="invite_code"
            required
            placeholder="20-character code"
            autoComplete="off"
            spellCheck={false}
            className={inputClass}
          />
          <button type="submit" className={buttonClass}>
            Join group
          </button>
        </form>
      </section>
    </main>
  );
}
