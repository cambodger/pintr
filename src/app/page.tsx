import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CopyField } from "@/components/copy-field";
import { PresenceMap, type PresencePin } from "@/components/presence-map";
import { Wordmark } from "@/components/wordmark";
import { InstallPrompt } from "@/components/install-prompt";
import { cityLabel, timeAgo } from "@/lib/format";
import { clearPresence, setGhost, signOut } from "./actions";

/**
 * Home — the map of who's in which city, the roster, your visibility toggle,
 * and a check-in CTA. All reads are RLS-scoped to your groups; ghosting
 * members are filtered out by the database itself (see the init migration).
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ ping?: string }>;
}) {
  const { ping } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login"); // belt-and-braces; the proxy guards this too

  const { data: me } = await supabase
    .from("members")
    .select("id, display_name, pin_emoji, status_text, status_emoji, ghost_mode")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) redirect("/onboarding");

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, invite_code")
    .order("created_at");
  // v1 expects one group per person (SPEC §2); if someone's in several we show
  // the oldest here and the full list lives on /group.
  const primaryGroup = groups?.[0];
  if (!primaryGroup) redirect("/onboarding");

  // Distinct members across all my groups, then their current locations.
  const { data: gm } = await supabase
    .from("group_members")
    .select("member_id")
    .is("left_at", null);
  const memberIds = [...new Set((gm ?? []).map((r) => r.member_id))];

  const [{ data: presence }, { data: roster }] = await Promise.all([
    supabase
      .from("live_presence")
      .select(
        "member_id, display_name, pin_emoji, status_text, status_emoji, city_id, city_name, country_code, lat, lng, since",
      ),
    supabase
      .from("members")
      .select("id, display_name, pin_emoji, ghost_mode")
      .in("id", memberIds.length ? memberIds : [me.id]),
  ]);

  const pins: PresencePin[] = (presence ?? [])
    .filter((p) => p.member_id && p.city_name && p.lat != null && p.lng != null)
    .map((p) => ({
      member_id: p.member_id as string,
      display_name: p.display_name ?? "Someone",
      pin_emoji: p.pin_emoji ?? "📍",
      status_text: p.status_text,
      status_emoji: p.status_emoji,
      city_name: p.city_name as string,
      country_code: p.country_code ?? "",
      lat: p.lat as number,
      lng: p.lng as number,
      since: p.since ?? new Date().toISOString(),
    }));

  const presenceByMember = new Map(
    (presence ?? []).filter((p) => p.member_id).map((p) => [p.member_id, p]),
  );

  // Roster ordering: people in a city first (most recent first), then the
  // rest. "you" always pinned to the top.
  const rosterSorted = [...(roster ?? [])].sort((a, b) => {
    if (a.id === me.id) return -1;
    if (b.id === me.id) return 1;
    const pa = presenceByMember.get(a.id);
    const pb = presenceByMember.get(b.id);
    if (pa && !pb) return -1;
    if (pb && !pa) return 1;
    if (pa && pb) return (pb.since ?? "").localeCompare(pa.since ?? "");
    return a.display_name.localeCompare(b.display_name);
  });

  const myPin = presenceByMember.get(me.id);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <header className="flex items-center justify-between">
        <Wordmark height={26} />
        <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
          <Link href="/settings" className="link">
            Settings
          </Link>
          <form action={signOut}>
            <button type="submit" className="link">
              Sod off
            </button>
          </form>
        </div>
      </header>

      <InstallPrompt />

      {ping && (
        <p role="status" className="mt-4 banner banner-ping text-sm">
          {ping}
        </p>
      )}

      {me.ghost_mode && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-[var(--surface)] px-3 py-2 text-sm">
          <span>
            👻 You&apos;ve gone dark — not a single cunt can see where you are.
          </span>
          <form action={setGhost}>
            <input type="hidden" name="ghost" value="false" />
            <button type="submit" className="font-medium link">
              Show yourself
            </button>
          </form>
        </div>
      )}

      <div className="mt-4">
        <PresenceMap pins={pins} meId={me.id} />
      </div>

      <Link href="/checkin" className="mt-4 block btn-amber text-center">
        📍 Drop your pin
      </Link>

      <div className="mt-3 flex justify-center gap-6 text-sm text-[var(--muted)]">
        <Link href="/pings" className="link">
          Pings
        </Link>
        <Link href="/group" className="link">
          Group
        </Link>
        {!me.ghost_mode && (
          <form action={setGhost}>
            <input type="hidden" name="ghost" value="true" />
            <button type="submit" className="link">
              Vanish
            </button>
          </form>
        )}
        {myPin && (
          <form action={clearPresence}>
            <button type="submit" className="link">
              Pack it in
            </button>
          </form>
        )}
      </div>

      <section className="mt-6 card p-4">
        <h2 className="font-semibold">Which cunts are about</h2>
        <ul className="mt-2 divide-y divide-[var(--line)]">
          {rosterSorted.map((m) => {
            const here = presenceByMember.get(m.id);
            const isMe = m.id === me.id;
            return (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <span className="text-2xl" aria-hidden>
                  {m.pin_emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {m.display_name}
                    {isMe && (
                      <span className="ml-1 text-xs text-[var(--muted)]">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-[var(--muted)]">
                    {here
                      ? `${cityLabel(here.city_name ?? "", here.country_code)} · ${timeAgo(here.since ?? "")}`
                      : m.ghost_mode
                        ? "👻 hiding, the coward"
                        : "off the grid"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-4 card p-4">
        <h2 className="font-semibold">{primaryGroup.name}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Fling this code at a mate to drag &apos;em in:
        </p>
        <div className="mt-3">
          <CopyField value={primaryGroup.invite_code} label="Group invite code" />
        </div>
      </section>
    </main>
  );
}
