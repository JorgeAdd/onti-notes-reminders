-- Initial schema: profiles, notes (with their optional reminder), tags,
-- note_tags, push_subscriptions.
-- Decisions: docs/adr/ADR-003-data-model-and-time.md
-- Rules:     docs/CONTRACT.md
--
-- All timestamps are timestamptz (stored in UTC). "Today", "overdue" and
-- presets are computed in the user's IANA timezone (profiles.timezone).

-- ─────────────────────────── helpers ───────────────────────────
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─────────────────────────── profiles ───────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  timezone    text not null default 'UTC',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on column public.profiles.timezone is
  'IANA timezone (e.g. America/Mexico_City). Validated by the API. Defaults to UTC until the client reports the browser timezone on first login.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- A profile row exists for every auth user.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────── notes ───────────────────────────
-- A note and its reminder are ONE object (brief §1), so the reminder lives
-- in the note row. due_at is null when the note has no reminder.
create table public.notes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 200),
  body             text not null default '' check (char_length(body) <= 20000),

  -- Reminder (all null when the note has no reminder)
  due_at           timestamptz,
  original_due_at  timestamptz,
  snooze_count     integer not null default 0 check (snooze_count >= 0),
  done_at          timestamptz,
  notified_due_at  timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  search           tsvector generated always as (
                     to_tsvector('simple', title || ' ' || body)
                   ) stored,

  unique (id, user_id),
  constraint notes_reminder_fields_consistent check (
    (due_at is null
      and original_due_at is null
      and snooze_count = 0
      and done_at is null
      and notified_due_at is null)
    or
    (due_at is not null and original_due_at is not null)
  )
);

comment on column public.notes.original_due_at is
  'Due time before any snooze. Reset only by a manual reschedule. Used by v2 "missed" metrics.';
comment on column public.notes.notified_due_at is
  'The due_at value a notification was last sent for. A reminder fires when due_at <= now, done_at is null and notified_due_at is distinct from due_at.';

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- Today page / overdue: open reminders per user, by due time.
create index notes_user_open_due_idx
  on public.notes (user_id, due_at)
  where due_at is not null and done_at is null;

-- Scheduler: open reminders across users, by due time.
create index notes_open_due_idx
  on public.notes (due_at)
  where due_at is not null and done_at is null;

-- All notes view.
create index notes_user_created_idx on public.notes (user_id, created_at desc);

-- Search.
create index notes_search_idx on public.notes using gin (search);

-- ─────────────────────────── tags ───────────────────────────
create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  slug        text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at  timestamptz not null default now(),
  unique (user_id, slug),
  unique (id, user_id)
);

-- note_tags carries user_id so the composite foreign keys guarantee a note
-- can only be tagged with a tag of the same user.
create table public.note_tags (
  user_id  uuid not null,
  note_id  uuid not null,
  tag_id   uuid not null,
  primary key (note_id, tag_id),
  foreign key (note_id, user_id) references public.notes (id, user_id) on delete cascade,
  foreign key (tag_id, user_id) references public.tags (id, user_id) on delete cascade
);

create index note_tags_tag_idx on public.note_tags (tag_id);

-- ─────────────────────────── push subscriptions ───────────────────────────
create table public.push_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  endpoint         text not null unique,
  p256dh           text not null,
  auth             text not null,
  user_agent       text,
  failure_count    integer not null default 0 check (failure_count >= 0),
  last_success_at  timestamptz,
  created_at       timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ─────────────────────────── row level security ───────────────────────────
-- Defense in depth (ADR-001): the API scopes every query by the JWT subject,
-- and RLS also blocks direct Data API access with a user's token.
alter table public.profiles           enable row level security;
alter table public.notes              enable row level security;
alter table public.tags               enable row level security;
alter table public.note_tags          enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "profiles: own row" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "notes: own rows" on public.notes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "tags: own rows" on public.tags
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "note_tags: own rows" on public.note_tags
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "push_subscriptions: own rows" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Privileges are explicit instead of relying on Supabase defaults.
-- The API runs each user request as `authenticated` with the JWT claims set
-- (ADR-001), so these policies apply to the API path too. No anonymous
-- access to any table.
revoke all on public.profiles, public.notes, public.tags, public.note_tags,
  public.push_subscriptions from anon;
grant select, insert, update, delete on public.profiles, public.notes,
  public.tags, public.note_tags, public.push_subscriptions to authenticated;
