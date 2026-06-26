import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cityLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Pings" };

/**
 * The pings feed: every time you and a mate were in the same city. RLS only
 * returns match rows you're part of (see match_events_select), so this is
 * personal, not a group-wide tracker.
 */
export default async function PingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("members")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) redirect("/onboarding");

  const { data: matches } = await supabase
    .from("match_events")
    .select("id, city_id, member_a, member_b, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // Resolve the "other person" and city names in a couple of follow-up reads.
  const otherIds = [
    ...new Set(
      (matches ?? []).map((m) => (m.member_a === me.id ? m.member_b : m.member_a)),
    ),
  ];
  const cityIds = [...new Set((matches ?? []).map((m) => m.city_id))];

  const [{ data: others }, { data: cities }] = await Promise.all([
    supabase
      .from("members")
      .select("id, display_name, pin_emoji")
      .in("id", otherIds.length ? otherIds : [me.id]),
    supabase
      .from("cities")
      .select("id, name, country_code")
      .in("id", cityIds.length ? cityIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  const otherById = new Map((others ?? []).map((m) => [m.id, m]));
  const cityById = new Map((cities ?? []).map((c) => [c.id, c]));

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--amber)]">
          Pings 🍻
        </h1>
        <Link
          href="/"
          className="text-sm link"
        >
          Back
        </Link>
      </header>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Every time you and a mate landed in the same city.
      </p>

      {(matches ?? []).length === 0 ? (
        <p className="mt-8 card-dashed p-6 text-center text-sm text-[var(--muted)]">
          No pings yet. Check in somewhere — when a mate&apos;s in the same
          city, it&apos;ll show up here.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {(matches ?? []).map((m) => {
            const otherId = m.member_a === me.id ? m.member_b : m.member_a;
            const other = otherById.get(otherId);
            const city = cityById.get(m.city_id);
            return (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <span className="text-2xl" aria-hidden>
                  {other?.pin_emoji ?? "🍻"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    You &amp; {other?.display_name ?? "a mate"}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {city ? cityLabel(city.name, city.country_code) : "somewhere"}
                    {" · "}
                    {new Date(m.created_at).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
