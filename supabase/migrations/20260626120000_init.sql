-- ============================================================================
-- pintr v1 — initial schema (see SPEC.md §4)
--
-- Design principles (mirrors the sitcom house style):
--   * Append-only presence ledger. presence_events is the fact table — each
--     row is "member X was in city Y at time T". Your CURRENT city is a view
--     over it (live_presence), never a mutable column. No updates/deletes:
--     to leave a city you append a 'cleared' event.
--   * Row-level security on everything; reads are scoped to people who share
--     a group with you. Ghost mode is enforced in RLS (not just the UI) — a
--     ghosting member's presence is invisible to the database query itself.
--   * Clients NEVER write tables directly. Every mutation goes through a
--     SECURITY DEFINER function via supabase.rpc(), so each one validates the
--     caller server-side.
--   * The account unit is the PERSON (members). This is the deliberate
--     divergence from sitcom, which is household-scoped (see SPEC.md §2).
-- ============================================================================

create extension if not exists pgcrypto; -- gen_random_bytes for invite codes

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- A person. One row per login identity; this is the account unit.
create table public.members (
  id            uuid primary key default gen_random_uuid(),
  -- unique: a login identity is exactly one person
  auth_user_id  uuid not null unique references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 80),
  -- your custom map marker, e.g. '🍺' '🧭' '🐙'
  pin_emoji     text not null default '📍' check (char_length(pin_emoji) between 1 and 16),
  -- a short "what I'm up to" line, shown next to your pin
  status_text   text check (status_text is null or char_length(status_text) <= 140),
  status_emoji  text check (status_emoji is null or char_length(status_emoji) <= 16),
  -- ghost mode: when true you vanish from everyone's map AND from the raw
  -- presence_events RLS read (see policies below). One-tap "go invisible".
  ghost_mode    boolean not null default false,
  created_at    timestamptz not null default now()
);

create table public.groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 80),
  -- 10 bytes = 80 bits: join_group() is callable by any signed-in user, so
  -- the code must hold up to online guessing. Shared as a link, rarely typed.
  invite_code  text not null unique default encode(gen_random_bytes(10), 'hex'),
  created_at   timestamptz not null default now()
);

create table public.group_members (
  group_id   uuid not null references public.groups (id) on delete cascade,
  member_id  uuid not null references public.members (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  left_at    timestamptz, -- null = currently a member
  primary key (group_id, member_id)
);

-- City dimension. Seeded with the common ones (see the seed migration); the
-- long tail is upserted on demand by check_in_by_coords() when someone
-- auto-detects from a city we've never seen. slug is the stable dedupe key.
create table public.cities (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null check (char_length(name) between 1 and 120),
  country_code  text not null check (char_length(country_code) = 2),
  lat           numeric(8,5) not null check (lat between -90 and 90),
  lng           numeric(8,5) not null check (lng between -180 and 180),
  created_at    timestamptz not null default now()
);

-- The fact table. Append-only (enforced by trigger below). 'cleared' events
-- have no city and mean "I'm no longer sharing a location".
create table public.presence_events (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members (id) on delete cascade,
  city_id     uuid references public.cities (id),
  source      text not null check (source in ('manual', 'auto', 'cleared')),
  -- a 'cleared' event carries no city; a real check-in always does
  check ((source = 'cleared') = (city_id is null)),
  created_at  timestamptz not null default now()
);

-- Recorded when two group-mates are in the same city. Pairwise rows, written
-- by check_in(); member_a < member_b keeps each pair canonical so we can
-- dedupe. Append-only. This is what the /pings feed reads.
create table public.match_events (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  city_id     uuid not null references public.cities (id),
  member_a    uuid not null references public.members (id) on delete cascade,
  member_b    uuid not null references public.members (id) on delete cascade,
  created_at  timestamptz not null default now(),
  check (member_a < member_b)
);

create index on public.group_members (member_id);
create index on public.cities (country_code, name);
create index on public.presence_events (member_id, created_at desc);
create index on public.match_events (member_a, created_at desc);
create index on public.match_events (member_b, created_at desc);

-- ---------------------------------------------------------------------------
-- Current-location view
--
-- One row per visible member with their latest non-'cleared' city. Plain
-- "latest event per member" via a lateral limit-1, dropped if that latest
-- event is a 'cleared' or the member is ghosting. security_invoker = true so
-- the caller's RLS on members/presence_events applies — without it the view
-- would run as owner and leak people outside your groups.
-- ---------------------------------------------------------------------------
create view public.live_presence
with (security_invoker = true) as
select
  m.id            as member_id,
  m.display_name,
  m.pin_emoji,
  m.status_text,
  m.status_emoji,
  c.id            as city_id,
  c.name          as city_name,
  c.country_code,
  c.lat,
  c.lng,
  latest.created_at as since
from public.members m
join lateral (
  select pe.city_id, pe.source, pe.created_at
  from public.presence_events pe
  where pe.member_id = m.id
  order by pe.created_at desc
  limit 1
) latest on true
join public.cities c on c.id = latest.city_id
where m.ghost_mode = false
  and latest.source <> 'cleared';

-- ---------------------------------------------------------------------------
-- RLS helper functions
--
-- Kept in a `private` schema so PostgREST never exposes them as API endpoints.
-- SECURITY DEFINER for two reasons: (1) policies that query the same table
-- they protect would recurse infinitely; (2) membership lookups must not
-- themselves be filtered by RLS. `set search_path = ''` pins name resolution
-- so a malicious search_path can't swap the tables out from under us.
-- ---------------------------------------------------------------------------

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.my_member_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select id
  from public.members
  where auth_user_id = (select auth.uid());
$$;

create or replace function private.my_group_ids()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select gm.group_id
  from public.group_members gm
  where gm.member_id = (select private.my_member_id())
    and gm.left_at is null;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
--
-- Deny-by-default: enabling RLS with no policy blocks everything. Reads are
-- scoped to people who share a group with you; all writes happen through the
-- SECURITY DEFINER functions further down (there are no insert/update/delete
-- policies on the function-only tables).
-- ---------------------------------------------------------------------------

alter table public.members          enable row level security;
alter table public.groups           enable row level security;
alter table public.group_members    enable row level security;
alter table public.cities           enable row level security;
alter table public.presence_events  enable row level security;
alter table public.match_events     enable row level security;

-- members: yourself, plus anyone sharing an active group with you. (ghost
-- mode does NOT hide your name/emoji — only your location — so a ghosting
-- friend still appears in the roster, just without a pin.)
create policy members_select on public.members
for select to authenticated
using (
  auth_user_id = (select auth.uid())
  or exists (
    select 1 from public.group_members gm
    where gm.member_id = members.id
      and gm.left_at is null
      and gm.group_id in (select private.my_group_ids())
  )
);
-- no insert/update/delete policy: member rows are created and edited only via
-- save_profile() / set_status() / set_ghost() (SECURITY DEFINER).

-- groups: visible only to members; created/joined via functions only
create policy groups_select on public.groups
for select to authenticated
using (id in (select private.my_group_ids()));

create policy group_members_select on public.group_members
for select to authenticated
using (group_id in (select private.my_group_ids()));

-- cities: a shared public dimension, readable by any signed-in user. Writes
-- happen only inside check_in_by_coords() (SECURITY DEFINER).
create policy cities_select on public.cities
for select to authenticated
using (true);

-- presence_events: your own always; others' only while they share a group
-- with you AND are not ghosting. This is where "go invisible" is actually
-- enforced — a ghosting member's rows are unreadable, view or no view.
create policy presence_events_select on public.presence_events
for select to authenticated
using (
  member_id = (select private.my_member_id())
  or exists (
    select 1
    from public.group_members gm
    join public.members m on m.id = gm.member_id and m.ghost_mode = false
    where gm.member_id = presence_events.member_id
      and gm.left_at is null
      and gm.group_id in (select private.my_group_ids())
  )
);

-- match_events: personal. You see a match only if you're one of the two
-- people in it — the /pings feed is "places you and a mate overlapped",
-- not a group-wide tracker.
create policy match_events_select on public.match_events
for select to authenticated
using (
  member_a = (select private.my_member_id())
  or member_b = (select private.my_member_id())
);

-- ---------------------------------------------------------------------------
-- Append-only enforcement. RLS already denies client writes, but the
-- SECURITY DEFINER functions bypass RLS as table owner — these triggers make
-- "presence is a ledger; never edit history" a hard database invariant.
-- ---------------------------------------------------------------------------

create or replace function private.forbid_event_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'presence is append-only — insert a new event instead of updating/deleting';
end;
$$;

create trigger presence_events_append_only
before update or delete on public.presence_events
for each row execute function private.forbid_event_change();

create trigger match_events_append_only
before update or delete on public.match_events
for each row execute function private.forbid_event_change();

-- ---------------------------------------------------------------------------
-- RPC functions — the only write path.
-- SECURITY DEFINER (runs as the migration owner, bypassing RLS) so each one
-- must validate the caller itself — every function starts from
-- private.my_member_id() and checks the caller's right to act.
-- ---------------------------------------------------------------------------

-- Onboarding step 1 / profile edit: create your member row on first call,
-- update it thereafter. Idempotent on auth_user_id.
create or replace function public.save_profile(p_display_name text, p_pin_emoji text default '📍')
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  m_id    uuid;
  v_name  text := trim(p_display_name);
  v_emoji text := coalesce(nullif(trim(p_pin_emoji), ''), '📍');
begin
  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    raise exception 'display name must be 1 to 80 characters';
  end if;
  if char_length(v_emoji) > 16 then
    raise exception 'pin emoji is too long';
  end if;

  insert into public.members (auth_user_id, display_name, pin_emoji)
  values ((select auth.uid()), v_name, v_emoji)
  on conflict (auth_user_id) do update
    set display_name = excluded.display_name,
        pin_emoji    = excluded.pin_emoji
  returning id into m_id;

  return m_id;
end;
$$;

-- Update your status line + emoji (independent of where you are).
create or replace function public.set_status(p_status_text text, p_status_emoji text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  m_id  uuid := private.my_member_id();
  v_txt text := nullif(trim(coalesce(p_status_text, '')), '');
  v_emj text := nullif(trim(coalesce(p_status_emoji, '')), '');
begin
  if m_id is null then
    raise exception 'set up your profile first';
  end if;
  if v_txt is not null and char_length(v_txt) > 140 then
    raise exception 'status must be 140 characters or fewer';
  end if;
  if v_emj is not null and char_length(v_emj) > 16 then
    raise exception 'status emoji is too long';
  end if;

  update public.members set status_text = v_txt, status_emoji = v_emj where id = m_id;
end;
$$;

-- One-tap invisibility toggle.
create or replace function public.set_ghost(p_ghost boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  m_id uuid := private.my_member_id();
begin
  if m_id is null then
    raise exception 'set up your profile first';
  end if;
  update public.members set ghost_mode = coalesce(p_ghost, false) where id = m_id;
end;
$$;

-- Create a group and join it. Returns the invite code to share.
create or replace function public.create_group(p_name text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  m_id   uuid := private.my_member_id();
  g_id   uuid;
  v_code text;
  v_name text := trim(p_name);
begin
  if m_id is null then
    raise exception 'set up your profile before creating a group';
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    raise exception 'group name must be 1 to 80 characters';
  end if;

  insert into public.groups (name) values (v_name)
  returning id, invite_code into g_id, v_code;

  insert into public.group_members (group_id, member_id) values (g_id, m_id);

  return v_code;
end;
$$;

-- Join a group by invite code; rejoining after leaving just clears left_at.
create or replace function public.join_group(p_code text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  m_id uuid := private.my_member_id();
  g_id uuid;
begin
  if m_id is null then
    raise exception 'set up your profile before joining a group';
  end if;

  select id into g_id from public.groups where invite_code = lower(trim(p_code));
  if not found then
    raise exception 'invalid invite code';
  end if;

  insert into public.group_members (group_id, member_id)
  values (g_id, m_id)
  on conflict (group_id, member_id) do nothing;

  -- FOUND is false when ON CONFLICT suppressed the insert: already a member,
  -- so just un-leave if they'd previously left.
  if not found then
    update public.group_members
    set left_at = null
    where group_id = g_id and member_id = m_id and left_at is not null;
  end if;

  return g_id;
end;
$$;

create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  m_id uuid := private.my_member_id();
begin
  if m_id is null then
    raise exception 'set up your profile first';
  end if;
  update public.group_members
  set left_at = now()
  where group_id = p_group_id and member_id = m_id and left_at is null;
end;
$$;

-- Stop sharing a location (append a 'cleared' event — history stays intact).
create or replace function public.clear_presence()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  m_id uuid := private.my_member_id();
begin
  if m_id is null then
    raise exception 'set up your profile first';
  end if;
  insert into public.presence_events (member_id, city_id, source)
  values (m_id, null, 'cleared');
end;
$$;

-- Group-mates whose LATEST presence event puts them in the given city right
-- now (non-ghost, active shared membership), one row per shared group. Pulled
-- out of check_in() so the match-insert and the banner-return share one
-- definition. Private + SECURITY DEFINER: only ever called from check_in().
create or replace function private.mates_in_city(p_member uuid, p_city uuid)
returns table (
  other_member_id uuid,
  display_name    text,
  pin_emoji       text,
  group_id        uuid,
  group_name      text
)
language sql stable security definer
set search_path = ''
as $$
  select
    other.id,
    other.display_name,
    other.pin_emoji,
    g.group_id,
    grp.name
  from public.members other
  join public.group_members g
    on g.member_id = other.id and g.left_at is null
  -- the caller must be an active member of the same group
  join public.group_members mine
    on mine.group_id = g.group_id
   and mine.member_id = p_member
   and mine.left_at is null
  join public.groups grp on grp.id = g.group_id
  join lateral (
    select pe.city_id, pe.source
    from public.presence_events pe
    where pe.member_id = other.id
    order by pe.created_at desc
    limit 1
  ) latest on true
  where other.id <> p_member
    and other.ghost_mode = false
    and latest.source <> 'cleared'
    and latest.city_id = p_city;
$$;

-- Check in to a known city. Records the presence event, writes a match row per
-- shared group for anyone already here (at most once per pair+city+group+day),
-- and RETURNS those people so the caller shows an instant "you're both here!".
create or replace function public.check_in(p_city_id uuid, p_source text default 'manual')
returns table (
  other_member_id   uuid,
  other_display_name text,
  other_pin_emoji   text,
  group_id          uuid,
  group_name        text,
  city_name         text
)
language plpgsql security definer
set search_path = ''
as $$
declare
  m_id uuid := private.my_member_id();
begin
  if m_id is null then
    raise exception 'set up your profile before checking in';
  end if;
  if p_source not in ('manual', 'auto') then
    raise exception 'invalid check-in source';
  end if;
  perform 1 from public.cities where id = p_city_id;
  if not found then
    raise exception 'unknown city';
  end if;

  insert into public.presence_events (member_id, city_id, source)
  values (m_id, p_city_id, p_source);

  -- record the matches (plain INSERT ... SELECT — runs unconditionally)
  insert into public.match_events (group_id, city_id, member_a, member_b)
  select
    o.group_id,
    p_city_id,
    least(m_id, o.other_member_id),
    greatest(m_id, o.other_member_id)
  from private.mates_in_city(m_id, p_city_id) o
  where not exists (
    select 1 from public.match_events me
    where me.group_id = o.group_id
      and me.city_id  = p_city_id
      and me.member_a = least(m_id, o.other_member_id)
      and me.member_b = greatest(m_id, o.other_member_id)
      and me.created_at >= date_trunc('day', now())
  );

  -- return everyone here now, for the banner
  return query
  select
    o.other_member_id,
    o.display_name,
    o.pin_emoji,
    o.group_id,
    o.group_name,
    (select c.name from public.cities c where c.id = p_city_id)
  from private.mates_in_city(m_id, p_city_id) o;
end;
$$;

-- Auto-detect path: a reverse-geocoded place from the browser. Upserts the
-- city (so the dimension grows naturally) then delegates to check_in().
create or replace function public.check_in_by_coords(
  p_lat numeric,
  p_lng numeric,
  p_city_name text,
  p_country_code text
)
returns table (
  other_member_id   uuid,
  other_display_name text,
  other_pin_emoji   text,
  group_id          uuid,
  group_name        text,
  city_name         text
)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_city_name, ''));
  v_cc   text := upper(left(regexp_replace(coalesce(p_country_code, ''), '[^a-zA-Z]', '', 'g'), 2));
  v_slug text;
  v_city uuid;
begin
  if v_name = '' then
    raise exception 'could not work out which city you are in';
  end if;
  if p_lat is null or p_lng is null then
    raise exception 'missing coordinates';
  end if;
  if char_length(v_cc) <> 2 then
    v_cc := 'XX';
  end if;

  v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || lower(v_cc);

  insert into public.cities (slug, name, country_code, lat, lng)
  values (v_slug, v_name, v_cc, round(p_lat, 5), round(p_lng, 5))
  on conflict (slug) do update set name = excluded.name
  returning id into v_city;

  return query select * from public.check_in(v_city, 'auto');
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants. Two layers of defence:
--   * RLS (above) controls which ROWS each user can read;
--   * table privileges here control which OPERATIONS exist at all, so every
--     table is read-only to clients and the only write path is the RPCs.
-- Supabase grants broad table privileges + EXECUTE to anon + authenticated by
-- default, hence the explicit revokes.
-- ---------------------------------------------------------------------------

revoke insert, update, delete on table public.members         from anon, authenticated;
revoke insert, update, delete on table public.groups          from anon, authenticated;
revoke insert, update, delete on table public.group_members   from anon, authenticated;
revoke insert, update, delete on table public.cities          from anon, authenticated;
revoke insert, update, delete on table public.presence_events from anon, authenticated;
revoke insert, update, delete on table public.match_events    from anon, authenticated;

grant select on public.live_presence to authenticated;

-- internal helper: never an API endpoint, never client-callable
revoke execute on function private.mates_in_city(uuid, uuid) from public, anon, authenticated;

-- RPCs are for signed-in users only
revoke execute on function public.save_profile(text, text)                       from public, anon;
revoke execute on function public.set_status(text, text)                         from public, anon;
revoke execute on function public.set_ghost(boolean)                             from public, anon;
revoke execute on function public.create_group(text)                             from public, anon;
revoke execute on function public.join_group(text)                               from public, anon;
revoke execute on function public.leave_group(uuid)                              from public, anon;
revoke execute on function public.clear_presence()                               from public, anon;
revoke execute on function public.check_in(uuid, text)                           from public, anon;
revoke execute on function public.check_in_by_coords(numeric, numeric, text, text) from public, anon;

grant execute on function public.save_profile(text, text)                        to authenticated;
grant execute on function public.set_status(text, text)                          to authenticated;
grant execute on function public.set_ghost(boolean)                              to authenticated;
grant execute on function public.create_group(text)                              to authenticated;
grant execute on function public.join_group(text)                                to authenticated;
grant execute on function public.leave_group(uuid)                               to authenticated;
grant execute on function public.clear_presence()                                to authenticated;
grant execute on function public.check_in(uuid, text)                            to authenticated;
grant execute on function public.check_in_by_coords(numeric, numeric, text, text) to authenticated;
