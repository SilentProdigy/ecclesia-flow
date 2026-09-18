create or replace function public.register_visitor_and_check_in(
  p_event_session_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text default null,
  p_email text default null
)
returns table (
  member_id uuid,
  member_no bigint,
  attendance_record_id uuid,
  checked_in_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_date date;

  v_member_id uuid;
  v_member_no bigint;

  v_attendance_record_id uuid;
  v_checked_in_at timestamptz;

  v_first_name text;
  v_last_name text;
  v_phone text;
  v_email text;
begin
  if not (
    select private.is_active_staff()
  ) then
    raise exception
      'Only active staff can register visitors.';
  end if;

  v_first_name :=
    nullif(
      btrim(p_first_name),
      ''
    );

  v_last_name :=
    nullif(
      btrim(p_last_name),
      ''
    );

  v_phone :=
    nullif(
      btrim(p_phone),
      ''
    );

  v_email :=
    nullif(
      lower(
        btrim(p_email)
      ),
      ''
    );

  if v_first_name is null then
    raise exception
      'First name is required.';
  end if;

  if v_last_name is null then
    raise exception
      'Last name is required.';
  end if;

  select
    s.session_date
  into
    v_session_date
  from public.event_sessions s
  where s.id =
    p_event_session_id
    and s.status =
      'open'::public.event_session_status;

  if v_session_date is null then
    raise exception
      'Attendance session is not open.';
  end if;

  insert into public.members (
    first_name,
    last_name,
    phone,
    email,
    member_type,
    status,
    first_attended_on,
    created_by,
    updated_by
  )
  values (
    v_first_name,
    v_last_name,
    v_phone,
    v_email,
    'visitor'::public.member_type,
    'active'::public.member_status,
    v_session_date,
    (select auth.uid()),
    (select auth.uid())
  )
  returning
    public.members.id,
    public.members.member_no
  into
    v_member_id,
    v_member_no;

  insert into public.attendance_records (
    event_session_id,
    member_id,
    check_in_method,
    checked_in_by,
    member_type_at_check_in
  )
  values (
    p_event_session_id,
    v_member_id,
    'manual'::public.attendance_method,
    (select auth.uid()),
    'visitor'::public.member_type
  )
  returning
    public.attendance_records.id,
    public.attendance_records.checked_in_at
  into
    v_attendance_record_id,
    v_checked_in_at;

  return query
  select
    v_member_id,
    v_member_no,
    v_attendance_record_id,
    v_checked_in_at;
end;
$$;

revoke all
on function public.register_visitor_and_check_in(
  uuid,
  text,
  text,
  text,
  text
)
from public;

revoke all
on function public.register_visitor_and_check_in(
  uuid,
  text,
  text,
  text,
  text
)
from anon;

grant execute
on function public.register_visitor_and_check_in(
  uuid,
  text,
  text,
  text,
  text
)
to authenticated;