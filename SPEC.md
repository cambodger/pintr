# pintr — Same-City Mate Finder PWA — v1 Spec

> **pintr** (lowercase wordmark) — pin + pint.
> *Know when your mates are in the same city. Time for a beer.*

A private location-sharing app for a small circle of friends who keep passing
through the same cities (London, mostly) without realising it. Share which
**city** you're in; get pinged when a mate's in the same one. Life360's vibe,
minus the surveillance: city-level, not metre-level, and trivially hideable.

Personal project, not a business: success = we actually grab a pint when we're
both in town. Secondary goal: a quick, fun build on the same stack as `sitcom`.

Research behind the design: see `RESEARCH.md`.

---

## 1. The idea

The real-world problem: two of us are in London the same Tuesday and only find
out from an Instagram story the next day. The fix isn't continuous tracking —
it's a lightweight signal of **"I'm in this city right now"** plus a nudge when
two signals collide.

North-star: **pints had that wouldn't have happened otherwise.** Not check-in
volume, not map dwell time.

## 2. Core concepts

- **Member** is the account unit — one person, one login. (Deliberate
  divergence from sitcom, which is household-scoped.)
- **Group** — a circle of mates, joined by invite code. v1 expects one group
  but models it properly from day one (members can be in several).
- **Presence is city-level.** You're "in London", never at a pinned address.
  Two ways to set it:
  1. **Manual check-in** — pick a city from the list. Always available, zero
     permissions.
  2. **Auto-detect** — one tap reads coarse GPS and reverse-geocodes it to a
     city name in the browser (no API key). Still only the city is stored.
- **Presence is a ledger.** Every check-in is an append-only `presence_events`
  row; your current city is a *view* over the latest one. "Stop sharing"
  appends a `cleared` event — history is never rewritten.
- **Ghost mode** — one tap to go fully invisible (you vanish from everyone's
  map and roster location), one tap to come back. Enforced in the database
  (RLS), not just the UI.
- **Pings** — when your check-in lands you in the same city as a non-ghosting
  group-mate, a `match_events` row is written (once per pair·city·group·day)
  and **you** get an instant "🍻 Sam's here too!" banner. The banner is
  one-way: the other person isn't pushed anything yet — they see it in their
  own pings feed next time they open the app (live background push is the first
  v1.5 add — SPEC §7).

## 3. Privacy model (the whole point)

- **City, never coordinates.** The schema stores `city_id`, full stop. There is
  nowhere to put a street address.
- **Ghost mode is real.** The `presence_events` RLS policy hides a ghosting
  member's rows from everyone but themselves — the API can't leak what the map
  doesn't show. Default behaviour when hidden: you disappear entirely (chosen
  for v1; "frozen last location" and per-person visibility are parked, §7).
- **Pings are personal.** You only see matches you're part of — pintr is not a
  group-wide "where is everyone" tracker.
- **Leave anytime.** Leaving a group (`left_at`) immediately drops you from its
  reads. No exit ceremony.

## 4. Data model (Supabase / Postgres)

Append-only presence ledger as a fact table; current location as a view. RLS
scopes all reads to people who share a group with you.

```
members          (id, auth_user_id, display_name, pin_emoji,
                  status_text, status_emoji, ghost_mode, created_at)
groups           (id, name, invite_code, created_at)
group_members    (group_id, member_id, joined_at, left_at)   -- left_at null = active
cities           (id, slug, name, country_code, lat, lng)    -- seeded dim + auto-grown

presence_events  (id, member_id, city_id null, source, created_at)
                 -- source: 'manual' | 'auto' | 'cleared'  (append-only)
match_events     (id, group_id, city_id, member_a, member_b, created_at)
                 -- member_a < member_b; one per pair·city·group·day (append-only)

live_presence (view) = latest non-'cleared' city per non-ghost member
```

All writes go through SECURITY DEFINER functions: `save_profile`, `set_status`,
`set_ghost`, `create_group`, `join_group`, `leave_group`, `check_in`,
`check_in_by_coords`, `clear_presence`. Clients have no table write grants.

## 5. Screens

1. **Home** — map of who's in which city (emoji pins), roster ("who's about"),
   ghost toggle, check-in CTA, group invite code, post-check-in ping banner
2. **Check in** — search the city list or "use my location" (auto-detect)
3. **Pings** — your feed of same-city matches
4. **Group** — members, invite code, leave
5. **Settings** — name, pin emoji, status line, visibility toggle
6. **Login / onboarding** — magic link → set profile → create/join a group

## 6. Stack

- **Next.js 16** (App Router) on **Vercel** hobby tier
- **Supabase** free tier — Postgres, magic-link auth, RLS for group scoping
- **Tailwind v4**; **Leaflet + OpenStreetMap** tiles for the map (free, no key)
- Reverse-geocoding: BigDataCloud client endpoint (free, keyless), browser-side
- **PWA**: manifest + icons; installable (web push lands in v1.5, iOS 16.4+)
- **Keep-alive**: daily Vercel cron pings the DB (free tier pauses after ~7d idle)
- Running cost target: **£0/month**. Domain: `pintr.cambodger.me` (later; the
  free `*.vercel.app` URL works day one)

## 7. v2 / v1.5 triggers — add the lever only when the symptom appears

| Observed symptom | Lever to add |
|---|---|
| "I never know unless the app's open" | **Web push** (VAPID + service worker) so the *other* person is pinged live — the first follow-up |
| "London's too broad — which bit?" | Opt-in **precise share** ("I'm at this pub") for a short window |
| "I want to be hidden from Dave but not Sam" | **Per-person visibility** instead of all-or-nothing ghost |
| "I always go dark on work trips" | **Scheduled invisibility** windows |
| "Tell me when anyone's near *me*, not just same city" | **Geofence boundaries** (needs background location — a real step up) |
| Group grows past a handful | Revisit notification noise + map clustering |

## 8. Parked (deliberately out of v1)

Background/continuous tracking · precise location · geofence boundaries ·
per-person & scheduled visibility · web push (v1.5, first up) · in-app chat
(deep-link to WhatsApp) · multiple-group niceties · travel history/timeline ·
"frozen last location" ghost variant.
