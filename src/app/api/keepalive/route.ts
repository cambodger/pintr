import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

// Supabase's free tier pauses projects after ~7 days without activity, and a
// "meet up for a pint" app is naturally quiet for days at a time. A daily
// Vercel cron (vercel.json) hits this route; the query touches Postgres,
// which counts as activity. Anonymous + RLS means it can't read anything —
// only the round trip matters.
export const dynamic = "force-dynamic";

export async function GET() {
  const { url, anonKey } = getSupabaseEnv();
  const supabase = createClient(url, anonKey);

  const { error } = await supabase
    .from("cities")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("keepalive ping failed:", error.message);
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true });
}
