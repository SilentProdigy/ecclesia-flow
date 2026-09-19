create or replace function public.sync_offline_visitor_and_check_in(
  p_member_id uuid,
  p_attendance_record_id uuid,
  p_event_session_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text default null,
  p_email text default null,
  p_checked_in_at timestamptz default now()
)
returns table (
  member_id uuid,
  member_no bigint,
  attendance_record_id uuid,
  checked_in_at timestamptz,
  sync_status text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_date date;
  v_member public.members%rowtype;
  v_attendance public.attendance_records%rowtype;
  v_first_name text;
  v_last_name text;
  v_phone text;
  v_email text;
begin
  if not (
    select private.is_active_staff()
  ) then
    raise exception
      'Only active staff can synchronize offline visitors.';
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
    ar.*
  into
    v_attendance
  from public.attendance_records ar
  where ar.id =
    p_attendance_record_id;

  if found then
    if
      v_attendance.event_session_id <>
        p_event_session_id
      or
      v_attendance.member_id <>
        p_member_id
    then
      raise exception
        'Offline attendance id conflicts with another attendance record.';
    end if;

    select
      m.*
    into
      v_member
    from public.members m
    where m.id =
      p_member_id;

    if not found then
      raise exception
        'Offline visitor member could not be found for the synchronized attendance record.';
    end if;

    return query
    select
      v_member.id,
      v_member.member_no,
      v_attendance.id,
      v_attendance.checked_in_at,
      'already_synced'::text;

    return;
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

  select
    m.*
  into
    v_member
  from public.members m
  where m.id =
    p_member_id;

  if not found then
    insert into public.members (
      id,
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
      p_member_id,
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
    returning *
    into v_member;
  else
    if v_member.member_type <>
      'visitor'::public.member_type
    then
      raise exception
        'Offline visitor member id conflicts with an existing non-visitor member.';
    end if;
  end if;

  select
    ar.*
  into
    v_attendance
  from public.attendance_records ar
  where ar.event_session_id =
    p_event_session_id
    and ar.member_id =
      p_member_id
    and ar.voided_at is null
  limit 1;

  if found then
    return query
    select
      v_member.id,
      v_member.member_no,
      v_attendance.id,
      v_attendance.checked_in_at,
      'already_checked_in'::text;

    return;
  end if;

  insert into public.attendance_records (
    id,
    event_session_id,
    member_id,
    check_in_method,
    checked_in_at,
    checked_in_by,
    member_type_at_check_in
  )
  values (
    p_attendance_record_id,
    p_event_session_id,
    p_member_id,
    'manual'::public.attendance_method,
    p_checked_in_at,
    (select auth.uid()),
    'visitor'::public.member_type
  )
  returning *
  into v_attendance;

  return query
  select
    v_member.id,
    v_member.member_no,
    v_attendance.id,
    v_attendance.checked_in_at,
    'synced'::text;
end;
$$;