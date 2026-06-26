import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CopyField } from "@/components/copy-field";
import { ConfirmButton } from "@/components/confirm-button";
import { leaveGroup } from "./actions";

export const metadata: Metadata = { title: "Group" };

export default async function GroupPage({
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
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) redirect("/onboarding");

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, invite_code")
    .order("created_at");
  if (!groups || groups.length === 0) redirect("/onboarding");

  // Members across all my groups, assembled into group_id → members[].
  const { data: gm } = await supabase
    .from("group_members")
    .select("group_id, member_id")
    .is("left_at", null);

  const memberIds = [...new Set((gm ?? []).map((r) => r.member_id))];
  const { data: members } = await supabase
    .from("members")
    .select("id, display_name, pin_emoji")
    .in("id", memberIds.length ? memberIds : [me.id]);

  const memberById = new Map((members ?? []).map((m) => [m.id, m]));
  const membersByGroup = new Map<string, typeof members>();
  for (const row of gm ?? []) {
    const list = membersByGroup.get(row.group_id) ?? [];
    const m = memberById.get(row.member_id);
    if (m) list.push(m);
    membersByGroup.set(row.group_id, list);
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-amber-600">
          {groups.length > 1 ? "Your groups" : "Your group"}
        </h1>
        <Link
          href="/"
          className="text-sm text-neutral-500 underline-offset-2 hover:underline"
        >
          Back
        </Link>
      </header>

      {status === "failed" && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          Something went wrong. Try again in a minute.
        </p>
      )}

      {groups.map((group) => {
        const groupMembers = membersByGroup.get(group.id) ?? [];
        return (
          <section
            key={group.id}
            className="mt-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <h2 className="font-semibold">{group.name}</h2>

            <ul className="mt-3 flex flex-col gap-1.5">
              {groupMembers.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <span className="text-lg" aria-hidden>
                    {m.pin_emoji}
                  </span>
                  <span>
                    {m.display_name}
                    {m.id === me.id && (
                      <span className="ml-1 text-xs text-neutral-400">
                        (you)
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-sm text-neutral-500">Invite code:</p>
            <div className="mt-1">
              <CopyField value={group.invite_code} label="Group invite code" />
            </div>

            <div className="mt-4">
              <form action={leaveGroup}>
                <input type="hidden" name="group_id" value={group.id} />
                <ConfirmButton
                  label="Leave group"
                  confirmLabel="Tap again to leave"
                />
              </form>
            </div>
          </section>
        );
      })}
    </main>
  );
}
