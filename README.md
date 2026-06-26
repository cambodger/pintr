# pintr 🍺

> **pintr** — pin + pint. *Know when your mates are in the same city.*

A private, friends-only PWA: share which **city** you're in, get pinged when a
mate's in the same one. Life360's vibe without the surveillance — city-level,
not metre-level, and one tap to go invisible.

- **What & why:** [SPEC.md](./SPEC.md) (v1 spec) and [RESEARCH.md](./RESEARCH.md)
  (the thinking behind it)
- **Stack:** Next.js 16 (App Router) · Supabase (Postgres, magic-link auth, RLS)
  · Tailwind v4 · Leaflet + OpenStreetMap · Vercel · £0/month target
- Built on the same bones as the `sitcom` app.

## Local development

```bash
npm install
npm run icons                # generate PWA icons (one-time, or after editing the script)
cp .env.example .env.local   # then fill in your Supabase credentials
npm run dev                  # http://localhost:3000
```

## Supabase setup (one-time)

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. Apply the migrations in `supabase/migrations/` in filename order: paste each
   into the SQL Editor (or `supabase db push` with the CLI). The second
   migration seeds ~75 cities; the rest grow themselves via auto-detect.
3. **Auth → URL Configuration:** set *Site URL* to `http://localhost:3000`
   (your production URL later).
4. **Custom SMTP (required).** Since Sept 2025 Supabase's built-in email only
   delivers to your own org's addresses and ignores template edits — real users
   never get a login email without your own SMTP. Any free provider works
   (Gmail app password, Brevo, Resend). **Project Settings → Authentication →
   SMTP Settings.**
5. **Auth → Email Templates → BOTH "Magic Link" AND "Confirm signup"** — replace
   the link in each with:

   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
   ```

   First-time users get *Confirm signup*, returning users get *Magic Link* —
   both must use this link or login breaks. It routes sign-in through the
   server-side `/auth/confirm` handler, which works regardless of which
   browser/device opens the email.
6. Copy *Project Settings → API* values into `.env.local`.
7. **Dev login (optional):** to use `/dev-login`, create a few test users
   (`andrewtjones85+pintrdev1..5@gmail.com`) in the dashboard with a shared
   password, and set that password as `DEV_LOGIN_PASSWORD` in `.env.local`.

## Architecture notes

- **Auth: magic-link email only (no passwords) — deliberate.** Login is a
  ~once-per-device event (sessions refresh forever via `src/proxy.ts`).
  `src/proxy.ts` refreshes the session on every request and guards routes.
  Server code uses `supabase.auth.getUser()` (validates the JWT), never
  `getSession()`.
- **Authorization lives in Postgres, not the app.** Every table has row-level
  security scoping reads to people who share a group with you. **Ghost mode is
  enforced in RLS** — a hidden member's presence rows are unreadable, so
  invisibility holds even against direct API calls.
- **Presence is an append-only ledger.** `presence_events` is the fact table;
  `live_presence` is a view of everyone's latest city. App code never writes
  tables directly — mutations go through SQL functions (`save_profile`,
  `set_status`, `set_ghost`, `create_group`, `join_group`, `leave_group`,
  `check_in`, `check_in_by_coords`, `clear_presence`) called via
  `supabase.rpc(...)`.
- **Location is city-level only.** Auto-detect reverse-geocodes coarse GPS to a
  city *name* in the browser; only the city is ever stored.
- **The map** uses Leaflet with free OpenStreetMap tiles — no key, no cost.

## Deployment

1. [vercel.com](https://vercel.com) → import this repo (Vercel detects Next.js).
2. Set the two env vars from `.env.example`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`), then deploy.
3. Supabase → **Auth → URL Configuration**: set *Site URL* to the
   `https://….vercel.app` URL; add `http://localhost:3000` under *Additional
   Redirect URLs* to keep local dev working.
4. The daily keep-alive cron ships in `vercel.json` (`/api/keepalive`) — without
   it Supabase's free tier pauses the DB after ~7 days idle. Verify under
   Vercel → Project → Settings → Cron Jobs after the first deploy.

Production target: **https://pintr.cambodger.me** (custom domain in Vercel →
Settings → Domains).

TODO before the group joins:

- Purge test data + dev users
- **Web push + service worker** (so you're pinged when the app's closed — v1.5)
- Nightly `pg_dump` backup to Unraid
- An "add to home screen" onboarding nudge (installed PWA = once-per-device
  login, and the prerequisite for iOS push)

## Known v1 gaps & accepted tradeoffs (deliberate)

- **Pings are not yet live in the background.** When you check in, *you* see the
  match instantly; the other person sees it next time they open the app. Real-
  time push is the first follow-up (SPEC §7).
- **Ghost mode is all-or-nothing** — fully invisible. Per-person and scheduled
  visibility are parked (SPEC §7); easy to add later.
- **Auto-detected cities can occasionally duplicate** a seeded one when the
  geocoder returns an accented or differently-spelled name. Harmless; dedupe is
  a parked cleanup.
- See SPEC §8 for everything else deliberately parked.
