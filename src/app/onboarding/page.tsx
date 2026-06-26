import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmojiPicker } from "@/components/emoji-picker";
import { createGroup, joinGroup, saveProfile } from "./actions";

export const metadata: Metadata = { title: "Get set up" };

const STATUS_MESSAGES: Record<string, { tone: "ok" | "error"; text: string }> =
  {
    profile_saved: {
      tone: "ok",
      text: "You're on the map, ya beauty — now join your mates or start your own lot.",
    },
    invalid_name: {
      tone: "error",
      text: "Your name needs to be 1 to 80 characters, ya cunt. It's not hard.",
    },
    invalid_group: {
      tone: "error",
      text: "Group names need to be 1 to 80 characters. Sort it out.",
    },
    bad_invite_code: {
      tone: "error",
      text: "That code's wrong, ya numpty — badger whoever sent it to you.",
    },
    rpc_failed: {
      tone: "error",
      text: "Something's gone tits up. Try again in a minute.",
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
          Welcome to pintr, ya legend
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          First up — how should you show up on the map, ya sexy cunt?
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
            <div>
              <span className="text-sm font-medium">Your pin emoji</span>
              <p className="mb-2 text-xs text-[var(--muted)]">
                This is your mug on the map. Pick one, ya animal.
              </p>
              <EmojiPicker name="pin_emoji" defaultValue="📍" />
            </div>
            <button type="submit" className={buttonClass}>
              Crack on
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
        Almost sorted, {me.display_name}
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        A group is your circle of reprobates. Start one and lob the code at your
        mates, or pile into one with a code some cunt sent you.
      </p>
      <StatusBanner status={status} />

      <section className="mt-8 card p-4">
        <h2 className="font-semibold">Start your own lot</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          You&apos;ll get an invite code to fling at your mates.
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
            Start the group
          </button>
        </form>
      </section>

      <div className="mt-6 text-center text-sm text-[var(--muted)]">— or —</div>

      <section className="mt-6 card p-4">
        <h2 className="font-semibold">Pile into a mate&apos;s group</h2>
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
            Pile in
          </button>
        </form>
      </section>
    </main>
  );
}
