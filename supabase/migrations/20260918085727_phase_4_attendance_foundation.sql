create type public.attendance_method as enum (
  'manual',
  'face',
  'qr'
);

create or replace function private.is_active_staff()
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
      and is_active = true
      and role in (
        'admin'::public.staff_role,
        'staff'::public.staff_role
      )
  );
$$;

revoke all on function private.is_active_staff() from public;
revoke all on function private.is_active_staff() from anon;
revoke all on function private.is_active_staff() from authenticated;

grant usage on schema private to authenticated;

grant execute
on function private.is_active_staff()
to authenticated;

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),

  event_session_id uuid not null
    references public.event_sessions(id)
    on delete restrict,

  member_id uuid not null
    references public.members(id)
    on delete restrict,

  check_in_method public.attendance_method not null
    default 'manual',

  checked_in_at timestamptz not null
    default now(),

  checked_in_by uuid
    references auth.users(id)
    on delete set null
    default auth.uid(),

  member_type_at_check_in public.member_type not null,

  notes text,

  voided_at timestamptz,

  voided_by uuid
    references auth.users(id)
    on delete set null,

  void_reason text,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint attendance_records_void_state_check
    check (
      (
        voided_at is null
        and voided_by is null
        and void_reason is null
      )
      or
      (
        voided_at is not null
        and voided_by is not null
        and char_length(
          btrim(void_reason)
        ) >= 3
      )
    )
);

create unique index attendance_records_active_unique_idx
on public.attendance_records (
  event_session_id,
  member_id
)
where voided_at is null;

create index attendance_records_session_idx
on public.attendance_records (
  event_session_id,
  checked_in_at
)
where voided_at is null;

create index attendance_records_member_idx
on public.attendance_records (
  member_id,
  checked_in_at desc
)
where voided_at is null;

create index attendance_records_checked_in_by_idx
on public.attendance_records (
  checked_in_by
);

create index attendance_records_voided_by_idx
on public.attendance_records (
  voided_by
)
where voided_by is not null;

create or replace function private.prepare_attendance_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_member_type public.member_type;
begin
  select member_type
  into selected_member_type
  from public.members
  where id = new.member_id;

  if selected_member_type is null then
    raise exception 'Member does not exist.';
  end if;

  new.member_type_at_check_in :=
    selected_member_type;

  if new.checked_in_by is null then
    new.checked_in_by :=
      (select auth.uid());
  end if;

  new.updated_at := now();

  return new;
end;
$$;

revoke all
on function private.prepare_attendance_record()
from public;

revoke all
on function private.prepare_attendance_record()
from anon;

revoke all
on function private.prepare_attendance_record()
from authenticated;

create trigger prepare_attendance_record
before insert
on public.attendance_records
for each row
execute function private.prepare_attendance_record();

create or replace function private.protect_attendance_record_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if
    new.event_session_id
      is distinct from old.event_session_id
    or new.member_id
      is distinct from old.member_id
    or new.check_in_method
      is distinct from old.check_in_method
    or new.checked_in_at
      is distinct from old.checked_in_at
    or new.checked_in_by
      is distinct from old.checked_in_by
    or new.member_type_at_check_in
      is distinct from old.member_type_at_check_in
    or new.created_at
      is distinct from old.created_at
  then
    raise exception
      'Core attendance fields are immutable.';
  end if;

  if old.voided_at is not null then
    if
      new.voided_at
        is distinct from old.voided_at
      or new.voided_by
        is distinct from old.voided_by
      or new.void_reason
        is distinct from old.void_reason
    then
      raise exception
        'Voided attendance records cannot be restored or re-voided.';
    end if;

  elsif new.voided_at is not null then
    new.voided_by :=
      (select auth.uid());

  elsif
    new.voided_by is not null
    or new.void_reason is not null
  then
    raise exception
      'Void metadata requires voided_at.';
  end if;

  new.updated_at := now();

  return new;
end;
$$;

revoke all
on function private.protect_attendance_record_update()
from public;

revoke all
on function private.protect_attendance_record_update()
from anon;

revoke all
on function private.protect_attendance_record_update()
from authenticated;

create trigger protect_attendance_record_update
before update
on public.attendance_records
for each row
execute function private.protect_attendance_record_update();

alter table public.attendance_records
enable row level security;

revoke all
on table public.attendance_records
from anon;

revoke all
on table public.attendance_records
from authenticated;

grant select, insert, update
on table public.attendance_records
to authenticated;

grant select, insert, update, delete
on table public.attendance_records
to service_role;

grant usage
on type public.attendance_method
to authenticated, service_role;

create policy
  "Active staff can read attendance"
on public.attendance_records
for select
to authenticated
using (
  (select private.is_active_staff())
);

create policy
  "Active staff can check in members"
on public.attendance_records
for insert
to authenticated
with check (
  (select private.is_active_staff())

  and checked_in_by =
    (select auth.uid())

  and voided_at is null
  and voided_by is null
  and void_reason is null

  and exists (
    select 1
    from public.event_sessions s
    where s.id = event_session_id
      and s.status =
        'open'::public.event_session_status
  )

  and exists (
    select 1
    from public.members m
    where m.id = member_id
      and m.status =
        'active'::public.member_status
  )
);

create policy
  "Active staff can correct attendance"
on public.attendance_records
for update
to authenticated
using (
  (select private.is_active_staff())
)
with check (
  (select private.is_active_staff())
);