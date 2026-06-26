<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# pintr — project conventions

Read `SPEC.md` before building anything; `RESEARCH.md` explains why each
design choice was made. Don't re-litigate decisions recorded there.

pintr is a sibling of the `sitcom` app and deliberately copies its stack and
patterns (Next.js 16 + Supabase + Tailwind v4 + Vercel PWA). If something here
is unclear, sitcom is the reference implementation.

## Hard rules

- **Never write `members`, `groups`, `group_members`, `cities`,
  `presence_events` or `match_events` from app code.** Those mutations go
  through the SQL functions in `supabase/migrations/` (`save_profile`,
  `set_status`, `set_ghost`, `create_group`, `join_group`, `leave_group`,
  `check_in`, `check_in_by_coords`, `clear_presence`) via `supabase.rpc(...)`.
  `presence_events` and `match_events` are append-only — enforced by trigger.
  To "leave" a city you append a `cleared` event, never an update/delete.
- **Authorization lives in Postgres RLS**, not app code. New tables get RLS
  policies in the same migration that creates them. UI checks are UX sugar.
- **Ghost mode is enforced in RLS** (the `presence_events` select policy
  filters out ghosting members), not just hidden in the UI. Keep it that way —
  invisibility you can defeat with the API isn't invisibility.
- **Migrations are applied by the Supabase GitHub integration on push to
  `main`** — never via MCP `apply_migration` (it records its own version
  number, desyncing the repo from `supabase_migrations.schema_migrations`).
  Write the file in `supabase/migrations/`, push, let the integration apply.
  Regenerate `src/lib/supabase/types.ts` after every migration.
- **The account unit is the PERSON** (`members`), not a household. This is the
  one deliberate divergence from sitcom — don't reintroduce a household layer.
- Server-side auth checks use `supabase.auth.getUser()`, never
  `getSession()` alone.
- Location is **city-level only**. Never store or display precise coordinates
  for a person — only the city they're in (SPEC §3). No paid services (£0/month).

## Conventions

- Server Components by default; Server Actions for mutations; Client
  Components only when interactivity demands it (the map, the city picker).
- Supabase clients: `@/lib/supabase/server` (server) and
  `@/lib/supabase/client` (browser) — never instantiate inline.
- `src/proxy.ts` (Next 16's middleware rename) handles session refresh and
  route guarding; public paths are `/login` and `/auth/*`.
- Status feedback is URL-based: actions `redirect('/path?status=code')` and the
  page maps the code to a friendly message (see the login/onboarding pages).
- Keep it KISS: fewer than ten mates use this. No premature abstraction. The
  SPEC §7 symptom→lever table says when to add complexity.

## Owner context

Andy (sole dev) is strong on SQL/dimensional modelling, still learning
React/Next.js/web tooling — explain non-SQL idioms when introducing them.
