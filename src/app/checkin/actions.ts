"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Build the banner the home page shows after a check-in. */
function pingMessage(
  city: string,
  matches: { other_display_name: string }[],
): string {
  if (!matches || matches.length === 0) {
    return `📍 Checked in to ${city}. No mates here yet — first round's on you. 🍺`;
  }
  const names = [...new Set(matches.map((m) => m.other_display_name))];
  if (names.length === 1) {
    return `🍻 ${city}: ${names[0]} is here too — go grab a pint!`;
  }
  const last = names.pop();
  return `🍻 ${city}: ${names.join(", ")} & ${last} are all here too!`;
}

/** Manual check-in: a city chosen from the seeded list. */
export async function checkInCity(formData: FormData) {
  const cityId = String(formData.get("city_id") ?? "");
  if (!UUID_RE.test(cityId)) {
    redirect("/checkin?status=bad_city");
  }

  const supabase = await createClient();
  const [{ data: city }, { data: matches, error }] = await Promise.all([
    supabase.from("cities").select("name").eq("id", cityId).maybeSingle(),
    supabase.rpc("check_in", { p_city_id: cityId }),
  ]);

  if (error) {
    console.error("check_in failed:", error.message);
    redirect("/checkin?status=failed");
  }

  redirect(
    `/?ping=${encodeURIComponent(pingMessage(city?.name ?? "your city", matches ?? []))}`,
  );
}

/** Auto-detect check-in: reverse-geocoded coords from the browser. */
export async function checkInCoords(formData: FormData) {
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const cityName = String(formData.get("city_name") ?? "").trim();
  const cc = String(formData.get("country_code") ?? "").trim();

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !cityName) {
    redirect("/checkin?status=bad_coords");
  }

  const supabase = await createClient();
  const { data: matches, error } = await supabase.rpc("check_in_by_coords", {
    p_lat: lat,
    p_lng: lng,
    p_city_name: cityName,
    p_country_code: cc,
  });

  if (error) {
    console.error("check_in_by_coords failed:", error.message);
    redirect("/checkin?status=failed");
  }

  redirect(`/?ping=${encodeURIComponent(pingMessage(cityName, matches ?? []))}`);
}
