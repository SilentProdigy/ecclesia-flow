-- ============================================================
-- ChurchFlow
-- Phase 3: Events & Event Sessions
-- ============================================================

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'event_type'
  ) then
    create type public.event_type as enum (
      'worship_service',
      'prayer_meeting',
      'youth_service',
      'ministry_event',
      'special_event',
      'other'
    );
  end if;
end $$;


do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'event_recurrence'
  ) then
    create type public.event_recurrence as enum (
      'none',
      'daily',
      'weekly',
      'monthly'
    );
  end if;
end $$;


do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'event_status'
  ) then
    create type public.event_status as enum (
      'active',
      'inactive',
      'archived'
    );
  end if;
end $$;


do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'event_session_status'
  ) then
    create type public.event_session_status as enum (
      'scheduled',
      'open',
      'completed',
      'cancelled'
    );
  end if;
end $$;


-- ------------------------------------------------------------
-- EVENTS
--
-- Represents the definition/template for a church event.
--
-- Examples:
--   Sunday Worship
--   Wednesday Prayer Meeting
--   Youth Fellowship
--   Anniversary Service
-- ------------------------------------------------------------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  description text,

  event_type public.event_type not null default 'worship_service',

  location text,

  status public.event_status not null default 'active',

  -- Recurrence definition
  recurrence public.event_recurrence not null default 'none',

  recurrence_interval integer not null default 1
    check (recurrence_interval > 0),

  -- PostgreSQL convention used by ChurchFlow:
  -- 0 = Sunday
  -- 1 = Monday
  -- ...
  -- 6 = Saturday
  days_of_week smallint[] not null default '{}',

  day_of_month smallint
    check (
      day_of_month is null
      or (
        day_of_month >= 1
        and day_of_month <= 31
      )
    ),

  starts_on date not null,

  ends_on date,

  default_start_time time not null,

  duration_minutes integer not null default 90
    check (
      duration_minutes > 0
      and duration_minutes <= 1440
    ),

  timezone text not null default 'Asia/Manila',

  created_by uuid
    references public.profiles(id)
    on delete set null,

  updated_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint events_name_not_empty
    check (char_length(trim(name)) > 0),

  constraint events_valid_date_range
    check (
      ends_on is null
      or ends_on >= starts_on
    ),

  constraint events_valid_days_of_week
    check (
      days_of_week <@ array[0,1,2,3,4,5,6]::smallint[]
    ),

  constraint events_weekly_requires_day
    check (
      recurrence <> 'weekly'
      or cardinality(days_of_week) > 0
    ),

  constraint events_monthly_requires_day
    check (
      recurrence <> 'monthly'
      or day_of_month is not null
    )
);


-- ------------------------------------------------------------
-- EVENT SESSIONS
--
-- Represents one actual occurrence of an event.
--
-- Example:
--
-- Event:
--   Sunday Worship
--
-- Session:
--   September 20, 2026
--   9:00 AM
-- ------------------------------------------------------------

create table if not exists public.event_sessions (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null
    references public.events(id)
    on delete restrict,

  session_date date not null,

  starts_at timestamptz not null,

  ends_at timestamptz not null,

  status public.event_session_status
    not null
    default 'scheduled',

  title_override text,

  location_override text,

  notes text,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  updated_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint event_sessions_valid_time
    check (ends_at > starts_at),

  constraint event_sessions_unique_occurrence
    unique (event_id, starts_at)
);


-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

create index if not exists events_status_idx
  on public.events(status);

create index if not exists events_type_idx
  on public.events(event_type);

create index if not exists events_starts_on_idx
  on public.events(starts_on);

create index if not exists event_sessions_event_id_idx
  on public.event_sessions(event_id);

create index if not exists event_sessions_session_date_idx
  on public.event_sessions(session_date);

create index if not exists event_sessions_starts_at_idx
  on public.event_sessions(starts_at);

create index if not exists event_sessions_status_idx
  on public.event_sessions(status);

create index if not exists event_sessions_upcoming_idx
  on public.event_sessions(status, starts_at);


-- ------------------------------------------------------------
-- UPDATED_AT FUNCTION
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists events_set_updated_at
  on public.events;

create trigger events_set_updated_at
before update on public.events
for each row
execute function public.set_updated_at();


drop trigger if exists event_sessions_set_updated_at
  on public.event_sessions;

create trigger event_sessions_set_updated_at
before update on public.event_sessions
for each row
execute function public.set_updated_at();


-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.events
enable row level security;

alter table public.event_sessions
enable row level security;


-- ------------------------------------------------------------
-- EVENTS POLICIES
--
-- Active Admin + Staff:
--   READ
--
-- Active Admin:
--   CREATE / UPDATE
--
-- No authenticated hard delete.
-- Events are archived instead.
-- ------------------------------------------------------------

drop policy if exists
  "Active staff can read events"
on public.events;

create policy
  "Active staff can read events"
on public.events
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_active = true
      and profiles.role in ('admin', 'staff')
  )
);


drop policy if exists
  "Active admins can create events"
on public.events;

create policy
  "Active admins can create events"
on public.events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_active = true
      and profiles.role = 'admin'
  )
);


drop policy if exists
  "Active admins can update events"
on public.events;

create policy
  "Active admins can update events"
on public.events
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_active = true
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_active = true
      and profiles.role = 'admin'
  )
);


-- ------------------------------------------------------------
-- EVENT SESSION POLICIES
-- ------------------------------------------------------------

drop policy if exists
  "Active staff can read event sessions"
on public.event_sessions;

create policy
  "Active staff can read event sessions"
on public.event_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_active = true
      and profiles.role in ('admin', 'staff')
  )
);


drop policy if exists
  "Active admins can create event sessions"
on public.event_sessions;

create policy
  "Active admins can create event sessions"
on public.event_sessions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_active = true
      and profiles.role = 'admin'
  )
);


drop policy if exists
  "Active admins can update event sessions"
on public.event_sessions;

create policy
  "Active admins can update event sessions"
on public.event_sessions
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_active = true
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_active = true
      and profiles.role = 'admin'
  )
);