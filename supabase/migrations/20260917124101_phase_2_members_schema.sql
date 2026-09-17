-- =========================================================
-- PHASE 2 / #21
-- Members schema
-- Ecclesia Flow
-- =========================================================

-- ---------------------------------------------------------
-- Member enums
-- ---------------------------------------------------------

create type public.member_type as enum (
  'member',
  'regular_attendee',
  'visitor'
);

create type public.member_status as enum (
  'active',
  'inactive'
);

create type public.face_enrollment_status as enum (
  'not_enrolled',
  'enrolled',
  'disabled'
);

-- ---------------------------------------------------------
-- Members
-- ---------------------------------------------------------

create table public.members (
  id uuid primary key default gen_random_uuid(),

  member_no bigint
    generated always as identity
    unique,

  -- Name
  first_name text not null,
  middle_name text,
  last_name text not null,
  suffix text,
  preferred_name text,

  -- Contact / personal details
  phone text,
  email text,
  date_of_birth date,
  gender text,
  address text,

  -- Church classification
  member_type public.member_type
    not null
    default 'member',

  status public.member_status
    not null
    default 'active',

  -- Allows long-time members to retain historical dates
  member_since date,
  first_attended_on date,

  -- Storage path will be implemented in #22
  photo_path text,

  -- Actual face biometric data comes later.
  -- This only tracks enrollment state.
  face_status public.face_enrollment_status
    not null
    default 'not_enrolled',

  notes text,

  -- Audit information
  created_by uuid
    references auth.users(id)
    on delete set null
    default auth.uid(),

  updated_by uuid
    references auth.users(id)
    on delete set null
    default auth.uid(),

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint members_first_name_not_blank
    check (
      char_length(btrim(first_name)) > 0
    ),

  constraint members_last_name_not_blank
    check (
      char_length(btrim(last_name)) > 0
    ),

  constraint members_email_not_blank
    check (
      email is null
      or char_length(btrim(email)) > 0
    ),

  constraint members_phone_not_blank
    check (
      phone is null
      or char_length(btrim(phone)) > 0
    )
);

-- ---------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------

create index members_name_idx
  on public.members (
    lower(last_name),
    lower(first_name)
  );

create index members_member_type_idx
  on public.members (member_type);

create index members_status_idx
  on public.members (status);

create index members_face_status_idx
  on public.members (face_status);

create index members_phone_idx
  on public.members (phone)
  where phone is not null;

create index members_email_idx
  on public.members (lower(email))
  where email is not null;

-- ---------------------------------------------------------
-- Automatically maintain updated_at / updated_by
-- ---------------------------------------------------------

create or replace function private.set_member_updated_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());

  return new;
end;
$$;

revoke all
on function private.set_member_updated_metadata()
from public;

revoke all
on function private.set_member_updated_metadata()
from anon;

revoke all
on function private.set_member_updated_metadata()
from authenticated;

create trigger set_member_updated_metadata
before update
on public.members
for each row
execute function private.set_member_updated_metadata();

-- ---------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------

alter table public.members
enable row level security;

-- No public/anonymous member access
revoke all
on table public.members
from anon;

revoke all
on table public.members
from authenticated;

-- Staff require these table-level privileges.
-- RLS still decides whether the operation is allowed.
grant select, insert, update
on table public.members
to authenticated;

grant select, insert, update, delete
on table public.members
to service_role;

grant usage, select
on sequence public.members_member_no_seq
to authenticated;

grant usage, select
on sequence public.members_member_no_seq
to service_role;

-- ---------------------------------------------------------
-- Staff member policies
-- ---------------------------------------------------------

create policy "Active staff can read members"
on public.members
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
  )
);

create policy "Active staff can create members"
on public.members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
  )
);

create policy "Active staff can update members"
on public.members
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
  )
);

-- =========================================================
-- Phase 1 security cleanup
-- =========================================================

create or replace function private.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::public.staff_role
      and is_active = true
  );
$$;

revoke all
on function private.is_active_admin()
from public;

revoke all
on function private.is_active_admin()
from anon;

revoke all
on function private.is_active_admin()
from authenticated;

grant usage
on schema private
to authenticated;

grant execute
on function private.is_active_admin()
to authenticated;

drop policy if exists
  "Admins can read all profiles"
on public.profiles;

drop policy if exists
  "Admins can update profiles"
on public.profiles;

create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (
  (select private.is_active_admin())
);

create policy "Admins can update profiles"
on public.profiles
for update
to authenticated
using (
  (select private.is_active_admin())
)
with check (
  (select private.is_active_admin())
);

drop function if exists public.is_admin();

drop function if exists public.handle_new_user();

revoke all
on function public.rls_auto_enable()
from public;

revoke all
on function public.rls_auto_enable()
from anon;

revoke all
on function public.rls_auto_enable()
from authenticated;

revoke all
on function public.rls_auto_enable()
from service_role;