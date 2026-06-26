import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { INVITE_CODE_RE, INVITE_COOKIE } from "@/lib/invite";

/**
 * Route Handler hit by the magic link in the sign-in email.
 * The email template must be set to:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 * (see README — Supabase setup). Verifying the token_hash here, server-side,
 * is the SSR-safe flow: the session cookie gets set by our own server rather
 * than relying on URL fragments that only the browser can see.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Only ever redirect to a relative path on this site — a "next" param that
  // points at another origin would be an open-redirect vulnerability.
  const next = searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      // If they followed an invite link before signing in, the code is waiting
      // in a cookie — bounce through /join to finish dropping them in. Consume
      // the cookie as we read it (the code rides in the URL from here, and
      // /join re-sets it if onboarding's still needed) so a lingering invite
      // can't silently auto-join on a later, unrelated sign-in.
      const jar = await cookies();
      const invite = jar.get(INVITE_COOKIE)?.value;
      jar.delete(INVITE_COOKIE);
      if (invite && INVITE_CODE_RE.test(invite)) {
        redirect(`/join/${invite}`);
      }
      redirect(safeNext);
    }
    console.error("verifyOtp failed:", error.message);
  }

  redirect("/login?status=invalid_link");
}
