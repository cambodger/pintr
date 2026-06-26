import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CityPicker } from "@/components/city-picker";

export const metadata: Metadata = { title: "Check in" };

const STATUS_MESSAGES: Record<string, string> = {
  bad_city: "That wasn't a valid city — try again.",
  bad_coords: "Couldn't read your location. Pick a city from the list.",
  failed: "Check-in failed. Try again in a minute.",
};

export default async function CheckinPage({
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

  // Need a profile before checking in (check_in() would reject otherwise).
  const { data: me } = await supabase
    .from("members")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) redirect("/onboarding");

  const { data: cities } = await supabase
    .from("cities")
    .select("id, name, country_code")
    .order("name");

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-amber-600">
          Check in
        </h1>
        <Link
          href="/"
          className="text-sm text-neutral-500 underline-offset-2 hover:underline"
        >
          Back
        </Link>
      </header>
      <p className="mt-1 text-sm text-neutral-500">
        Let your mates know which city you&apos;re in. We only ever share the
        city — never your exact spot.
      </p>

      {status && STATUS_MESSAGES[status] && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {STATUS_MESSAGES[status]}
        </p>
      )}

      <div className="mt-6">
        <CityPicker cities={cities ?? []} />
      </div>
    </main>
  );
}
