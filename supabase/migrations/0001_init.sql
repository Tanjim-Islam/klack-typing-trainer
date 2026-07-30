-- =============================================================================
-- Klack — initial schema
--
-- Five tables, one aggregate view and one write function:
--
--   profiles          one row per account, created automatically on sign-up
--   user_settings     the settings document, one row per account
--   test_results      one row per completed test
--   result_key_stats  one row per character typed in a test (the fumble ledger)
--   drills            custom drills; built-in drills stay in application code
--
--   user_key_stats    view: lifetime hits/misses/accuracy per character
--   save_test_results function: writes results and their key stats atomically
--
-- Every table is protected by row level security keyed on auth.uid(), so a
-- signed-in user can only ever see or touch their own rows.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger helper: stamps updated_at on every UPDATE.';

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  display_name  text check (display_name is null or char_length(display_name) <= 48),
  -- Populated from the Google profile picture when signing in with Google.
  avatar_url    text,
  -- Whether the onboarding card on the Type page has been dismissed.
  onboarded     boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is
  'Public-facing account data. One row per auth.users row, created by trigger.';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- user_settings
--
-- Typed columns rather than a JSON blob: the allowed values are a closed set,
-- and a bad write should be rejected by the database, not discovered later.
-- The CHECK lists mirror the zod enums in lib/types.ts.
-- -----------------------------------------------------------------------------

create table if not exists public.user_settings (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  theme           text     not null default 'system' check (theme in ('system', 'light', 'dark')),
  accent          text     not null default 'teal'   check (accent in ('teal', 'amber', 'cobalt')),
  motion          text     not null default 'system' check (motion in ('system', 'reduced')),
  default_mode    text     not null default 'time'   check (default_mode in ('time', 'words', 'quote', 'code', 'drill')),
  duration        smallint not null default 30       check (duration in (15, 30, 60, 120)),
  word_count      smallint not null default 25       check (word_count in (10, 25, 50, 100)),
  punctuation     boolean  not null default false,
  numbers         boolean  not null default false,
  stop_on_error   boolean  not null default false,
  show_live_stats boolean  not null default true,
  caret           text     not null default 'block'  check (caret in ('block', 'line', 'underline')),
  text_size       text     not null default 'md'     check (text_size in ('md', 'lg')),
  sound           boolean  not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.user_settings is
  'The settings document. Column checks mirror the zod enums in lib/types.ts.';

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- test_results
--
-- client_id is the id the browser generated for the test. It makes syncing
-- idempotent: the same test pushed twice updates one row instead of creating
-- two, which matters when a device uploads history it recorded while offline.
-- -----------------------------------------------------------------------------

create table if not exists public.test_results (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid        not null references auth.users (id) on delete cascade,
  client_id          text        not null check (char_length(client_id) between 1 and 64),
  taken_at           timestamptz not null,
  mode               text        not null check (mode in ('time', 'words', 'quote', 'code', 'drill')),
  label              text        not null check (char_length(label) between 1 and 80),
  elapsed_ms         integer     not null check (elapsed_ms >= 0),
  wpm                numeric(7, 2) not null check (wpm >= 0),
  raw_wpm            numeric(7, 2) not null check (raw_wpm >= 0),
  accuracy           numeric(5, 2) not null check (accuracy between 0 and 100),
  consistency        numeric(5, 2) not null check (consistency between 0 and 100),
  correct_chars      integer     not null check (correct_chars >= 0),
  incorrect_chars    integer     not null check (incorrect_chars >= 0),
  keystrokes         integer     not null check (keystrokes >= 0),
  correct_keystrokes integer     not null check (correct_keystrokes >= 0),
  words              integer     not null check (words >= 0),
  -- Net wpm sampled once per second, for the results sparkline.
  samples            real[]      not null default '{}' check (array_length(samples, 1) is null or array_length(samples, 1) <= 600),
  created_at         timestamptz not null default now(),
  constraint test_results_user_client_key unique (user_id, client_id)
);

comment on table public.test_results is
  'One row per completed test. Scores only; per-key detail lives in result_key_stats.';

create index if not exists test_results_user_taken_at_idx
  on public.test_results (user_id, taken_at desc);

create index if not exists test_results_user_mode_idx
  on public.test_results (user_id, mode);

-- -----------------------------------------------------------------------------
-- result_key_stats
--
-- The fumble ledger: for every test, how many times each character was hit
-- correctly and how many times it was missed. user_id is denormalised so row
-- level security and the aggregate view never need a join.
-- -----------------------------------------------------------------------------

create table if not exists public.result_key_stats (
  result_id uuid    not null references public.test_results (id) on delete cascade,
  user_id   uuid    not null references auth.users (id) on delete cascade,
  -- A single character, e.g. `a`, `A`, `;`, ` `.
  char      text    not null check (char_length(char) = 1),
  hits      integer not null default 0 check (hits >= 0),
  misses    integer not null default 0 check (misses >= 0),
  primary key (result_id, char)
);

comment on table public.result_key_stats is
  'Per-character hit/miss tally for one test. The data weak-key analysis reads.';

create index if not exists result_key_stats_user_char_idx
  on public.result_key_stats (user_id, char);

-- -----------------------------------------------------------------------------
-- drills
--
-- Only custom drills are stored. The seven built-ins ship in lib/content.ts so
-- they can be corrected in a release without a data migration.
-- -----------------------------------------------------------------------------

create table if not exists public.drills (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  client_id   text        not null check (char_length(client_id) between 1 and 64),
  name        text        not null check (char_length(name) between 1 and 48),
  description text        not null default '' check (char_length(description) <= 160),
  text        text        not null check (char_length(text) between 20 and 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint drills_user_client_key unique (user_id, client_id)
);

comment on table public.drills is
  'User-authored practice text. Built-in drills are code, not rows.';

create index if not exists drills_user_updated_at_idx
  on public.drills (user_id, updated_at desc);

drop trigger if exists drills_set_updated_at on public.drills;
create trigger drills_set_updated_at
  before update on public.drills
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- user_key_stats — lifetime per-character accuracy
--
-- security_invoker makes the view run with the caller's privileges, so the row
-- level security policy on result_key_stats applies to it too.
-- -----------------------------------------------------------------------------

create or replace view public.user_key_stats
with (security_invoker = true) as
select
  user_id,
  char,
  sum(hits)::bigint            as hits,
  sum(misses)::bigint          as misses,
  sum(hits + misses)::bigint   as attempts,
  case
    when sum(hits + misses) > 0
      then round(sum(hits)::numeric * 100 / sum(hits + misses), 2)
    else 100
  end                          as accuracy
from public.result_key_stats
group by user_id, char;

comment on view public.user_key_stats is
  'Lifetime hits, misses and accuracy per character for the signed-in user.';

-- =============================================================================
-- Row level security
--
-- One policy per operation, each using (select auth.uid()) so the planner
-- evaluates it once per statement rather than once per row.
-- =============================================================================

alter table public.profiles         enable row level security;
alter table public.user_settings    enable row level security;
alter table public.test_results     enable row level security;
alter table public.result_key_stats enable row level security;
alter table public.drills           enable row level security;

-- profiles ---------------------------------------------------------------------
drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
drop policy if exists "profiles: delete own" on public.profiles;

create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles: delete own" on public.profiles
  for delete to authenticated using ((select auth.uid()) = id);

-- user_settings ----------------------------------------------------------------
drop policy if exists "user_settings: read own"   on public.user_settings;
drop policy if exists "user_settings: insert own" on public.user_settings;
drop policy if exists "user_settings: update own" on public.user_settings;
drop policy if exists "user_settings: delete own" on public.user_settings;

create policy "user_settings: read own" on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_settings: insert own" on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_settings: update own" on public.user_settings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_settings: delete own" on public.user_settings
  for delete to authenticated using ((select auth.uid()) = user_id);

-- test_results -----------------------------------------------------------------
drop policy if exists "test_results: read own"   on public.test_results;
drop policy if exists "test_results: insert own" on public.test_results;
drop policy if exists "test_results: update own" on public.test_results;
drop policy if exists "test_results: delete own" on public.test_results;

create policy "test_results: read own" on public.test_results
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "test_results: insert own" on public.test_results
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "test_results: update own" on public.test_results
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "test_results: delete own" on public.test_results
  for delete to authenticated using ((select auth.uid()) = user_id);

-- result_key_stats -------------------------------------------------------------
drop policy if exists "result_key_stats: read own"   on public.result_key_stats;
drop policy if exists "result_key_stats: insert own" on public.result_key_stats;
drop policy if exists "result_key_stats: update own" on public.result_key_stats;
drop policy if exists "result_key_stats: delete own" on public.result_key_stats;

create policy "result_key_stats: read own" on public.result_key_stats
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "result_key_stats: insert own" on public.result_key_stats
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "result_key_stats: update own" on public.result_key_stats
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "result_key_stats: delete own" on public.result_key_stats
  for delete to authenticated using ((select auth.uid()) = user_id);

-- drills -----------------------------------------------------------------------
drop policy if exists "drills: read own"   on public.drills;
drop policy if exists "drills: insert own" on public.drills;
drop policy if exists "drills: update own" on public.drills;
drop policy if exists "drills: delete own" on public.drills;

create policy "drills: read own" on public.drills
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "drills: insert own" on public.drills
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "drills: update own" on public.drills
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "drills: delete own" on public.drills
  for delete to authenticated using ((select auth.uid()) = user_id);

-- =============================================================================
-- save_test_results
--
-- Writing a test means one row in test_results plus up to ~90 rows in
-- result_key_stats. Doing that from the client would be two round trips with a
-- window where a result exists with no key stats, so it happens here instead:
-- one call, one transaction.
--
-- SECURITY INVOKER (the default) is deliberate — row level security still
-- applies, so this function cannot be used to write into someone else's rows.
-- It accepts an array so the same code path handles a single finished test and
-- a bulk upload of history recorded before sign-in.
-- =============================================================================

create or replace function public.save_test_results(p_results jsonb)
returns setof uuid
language plpgsql
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_item jsonb;
  v_id   uuid;
begin
  if v_user is null then
    raise exception 'save_test_results: not authenticated' using errcode = '42501';
  end if;

  if p_results is null or jsonb_typeof(p_results) <> 'array' then
    raise exception 'save_test_results: expected a JSON array' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_results)
  loop
    insert into public.test_results (
      user_id, client_id, taken_at, mode, label, elapsed_ms,
      wpm, raw_wpm, accuracy, consistency,
      correct_chars, incorrect_chars, keystrokes, correct_keystrokes, words, samples
    )
    values (
      v_user,
      v_item ->> 'id',
      to_timestamp((v_item ->> 'at')::bigint / 1000.0),
      v_item ->> 'mode',
      v_item ->> 'label',
      (v_item ->> 'elapsedMs')::numeric::integer,
      (v_item ->> 'wpm')::numeric,
      (v_item ->> 'rawWpm')::numeric,
      (v_item ->> 'accuracy')::numeric,
      (v_item ->> 'consistency')::numeric,
      (v_item ->> 'correctChars')::integer,
      (v_item ->> 'incorrectChars')::integer,
      (v_item ->> 'keystrokes')::integer,
      (v_item ->> 'correctKeystrokes')::integer,
      (v_item ->> 'words')::integer,
      coalesce(
        (
          select array_agg(s.value::text::real order by s.ord)
          from jsonb_array_elements(coalesce(v_item -> 'samples', '[]'::jsonb))
               with ordinality as s(value, ord)
        ),
        '{}'::real[]
      )
    )
    on conflict (user_id, client_id) do update set
      taken_at           = excluded.taken_at,
      mode               = excluded.mode,
      label              = excluded.label,
      elapsed_ms         = excluded.elapsed_ms,
      wpm                = excluded.wpm,
      raw_wpm            = excluded.raw_wpm,
      accuracy           = excluded.accuracy,
      consistency        = excluded.consistency,
      correct_chars      = excluded.correct_chars,
      incorrect_chars    = excluded.incorrect_chars,
      keystrokes         = excluded.keystrokes,
      correct_keystrokes = excluded.correct_keystrokes,
      words              = excluded.words,
      samples            = excluded.samples
    returning id into v_id;

    -- Replace rather than merge: the incoming tally is the whole truth for
    -- this test, so a re-sync must not double-count.
    delete from public.result_key_stats where result_id = v_id;

    insert into public.result_key_stats (result_id, user_id, char, hits, misses)
    select
      v_id,
      v_user,
      k.key,
      coalesce((k.value ->> 'h')::integer, 0),
      coalesce((k.value ->> 'm')::integer, 0)
    from jsonb_each(coalesce(v_item -> 'keyStats', '{}'::jsonb)) as k(key, value)
    where char_length(k.key) = 1;

    return next v_id;
  end loop;
end;
$$;

comment on function public.save_test_results(jsonb) is
  'Upserts an array of test results and their per-key tallies in one transaction.';

-- =============================================================================
-- Sign-up wiring
--
-- A new account needs a profile row and a settings row before the app can read
-- anything. Doing it in a trigger on auth.users means it happens whatever the
-- sign-up route was: email and password, or Continue with Google.
--
-- SECURITY DEFINER is required here: the trigger runs while the row in
-- auth.users is being created, before any authenticated session exists, so
-- row level security has no auth.uid() to check against.
-- =============================================================================

-- The name and picture arrive under different keys depending on the route in:
-- our own sign-up form writes display_name, Google's OIDC claims arrive as
-- full_name / name and avatar_url / picture.
create or replace function public.profile_name_from_meta(meta jsonb)
returns text
language sql
immutable
as $$
  select nullif(trim(left(coalesce(
    meta ->> 'display_name',
    meta ->> 'full_name',
    meta ->> 'name',
    ''
  ), 48)), '');
$$;

create or replace function public.profile_avatar_from_meta(meta jsonb)
returns text
language sql
immutable
as $$
  select nullif(trim(coalesce(meta ->> 'avatar_url', meta ->> 'picture', '')), '');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    public.profile_name_from_meta(new.raw_user_meta_data),
    public.profile_avatar_from_meta(new.raw_user_meta_data)
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates the profile and settings rows for a newly registered account.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the profile in step with the identity. Google can hand back a changed
-- name or a new picture URL on any sign-in, and email can change too.
create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles p set
    email        = new.email,
    -- Never overwrite a name or picture the user set with a null from the
    -- provider; only fill in or refresh when the provider actually sends one.
    display_name = coalesce(public.profile_name_from_meta(new.raw_user_meta_data), p.display_name),
    avatar_url   = coalesce(public.profile_avatar_from_meta(new.raw_user_meta_data), p.avatar_url)
  where p.id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row
  when (
    old.email is distinct from new.email
    or old.raw_user_meta_data is distinct from new.raw_user_meta_data
  )
  execute function public.handle_user_updated();

-- =============================================================================
-- Grants
--
-- Row level security decides which rows; these decide which tables the API
-- roles can reach at all. `anon` is granted nothing: every table here is
-- private to a signed-in user.
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Supabase grants new public tables to `anon` by default. Nothing here is ever
-- readable without a session, so take that back: row level security already
-- returns no rows to `anon`, but a signed-out request should be refused at the
-- privilege check rather than quietly answered with an empty list.
revoke all on
  public.profiles,
  public.user_settings,
  public.test_results,
  public.result_key_stats,
  public.drills,
  public.user_key_stats
from anon;

revoke all on function public.save_test_results(jsonb) from anon, public;

grant select, insert, update, delete on
  public.profiles,
  public.user_settings,
  public.test_results,
  public.result_key_stats,
  public.drills
to authenticated;

grant select on public.user_key_stats to authenticated;

grant execute on function public.save_test_results(jsonb) to authenticated;

grant all on
  public.profiles,
  public.user_settings,
  public.test_results,
  public.result_key_stats,
  public.drills
to service_role;
