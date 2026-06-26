import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { INVITE_COOKIE, INVITE_CODE_RE } from "@/lib/invite";

/**
 * Smart invite router. A shared `/join/<code>` link funnels through here and
 * the mate ends up in the group without ever typing the code:
 *
 *   - logged out       → stash the code in a cookie, send to /login. The
 *                        magic-link round-trip drops it, the cookie carries it
 *                        back (see /auth/confirm).
 *   - signed in, no    → stash the code, send to /onboarding. saveProfile()
 *     profile yet         finishes the join once they have a member row.
 *   - signed in + has  → join right now, clear the cookie, land on the map.
 *     a profile
 *
 * join_group() is idempotent — already-a-member just no-ops — so bouncing
 * through here twice (which the auth round-trip does) is harmless.
 */
const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60, // an hour — plenty to finish signing in
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const norm = code.trim().toLowerCase();
  const origin = request.nextUrl.origin;

  // Reject anything that isn't a real invite code before touching the DB.
  if (!INVITE_CODE_RE.test(norm)) {
    return NextResponse.redirect(new URL("/login?status=invalid_link", origin));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not signed in → remember the code and send them to sign in.
  if (!user) {
    const res = NextResponse.redirect(new URL("/login?status=invite", origin));
    res.cookies.set(INVITE_COOKIE, norm, cookieOpts);
    return res;
  }

  // Signed in but no profile yet → remember it; saveProfile() finishes the job.
  const { data: me } = await supabase
    .from("members")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) {
    const res = NextResponse.redirect(new URL("/onboarding", origin));
    res.cookies.set(INVITE_COOKIE, norm, cookieOpts);
    return res;
  }

  // Signed in with a profile → join now.
  const { error } = await supabase.rpc("join_group", { p_code: norm });
  const ping = error
    ? "That invite's knackered, ya cunt — get the link off your mate again."
    : "🍻 You're in! Get the pints in.";
  const res = NextResponse.redirect(
    new URL(`/?ping=${encodeURIComponent(ping)}`, origin),
  );
  res.cookies.delete(INVITE_COOKIE);
  return res;
}
