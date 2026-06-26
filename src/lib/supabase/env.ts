/**
 * Single source of truth for Supabase connection config.
 *
 * NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so they
 * must be referenced as full static expressions (no dynamic lookup). The anon /
 * publishable key is safe to expose to the browser — row-level security in
 * Postgres is what controls data access, not key secrecy.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.example to .env.local and fill in your Supabase project credentials.",
    );
  }

  return { url, anonKey };
}
