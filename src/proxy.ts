import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Runs before every matched request (Next.js 16's rename of middleware).
 * Two jobs:
 *  1. Refresh the Supabase auth session and keep its cookies in sync —
 *     without this, server-side sessions silently expire.
 *  2. Route guarding: unauthenticated users go to /login, authenticated
 *     users are bounced away from /login.
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() validates the JWT with the Supabase auth server — never trust
  // getSession() here, its data comes straight from the (forgeable) cookie.
  // Do not run other code between createServerClient and getUser(): it makes
  // sessions randomly log out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicPath =
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    // Invite links work out who you are and route accordingly (they handle the
    // logged-out case themselves), so they mustn't be bounced to /login.
    path.startsWith("/join") ||
    // Daily DB ping from the Vercel cron — must not bounce to /login.
    path === "/api/keepalive" ||
    // Dev-only test-user switcher (the page itself 404s in production).
    (process.env.NODE_ENV === "development" && path.startsWith("/dev-login"));

  if (!user && !isPublicPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && path.startsWith("/login")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // Always return the response built by the cookie handler above, otherwise
  // refreshed session cookies never reach the browser.
  return response;
}

export const config = {
  // Run on everything except static assets — auth logic must never block
  // CSS/JS/images, and the PWA manifest + icons must load pre-login.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|apple-touch-icon\\.png|sw\\.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
