create or replace function public.create_event_with_sessions(
  p_event jsonb,
  p_sessions jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_id uuid;
  v_session jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role = 'admin'
  ) then
    raise exception 'Admin access required.';
  end if;

  if p_event is null or jsonb_typeof(p_event) <> 'object' then
    raise exception 'Invalid event payload.';
  end if;

  if p_sessions is null then
    p_sessions := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_sessions) <> 'array' then
    raise exception 'Invalid sessions payload.';
  end if;

  insert into public.events (
    name,
    description,
    event_type,
    location,
    status,
    recurrence,
    recurrence_interval,
    days_of_week,
    day_of_month,
    starts_on,
    ends_on,
    default_start_time,
    duration_minutes,
    timezone,
    created_by,
    updated_by
  )
  values (
    trim(p_event ->> 'name'),
    nullif(trim(coalesce(p_event ->> 'description', '')), ''),
    (p_event ->> 'event_type')::public.event_type,
    nullif(trim(coalesce(p_event ->> 'location', '')), ''),
    (p_event ->> 'status')::public.event_status,
    (p_event ->> 'recurrence')::public.event_recurrence,
    (p_event ->> 'recurrence_interval')::integer,
    array(
      select value::smallint
      from jsonb_array_elements_text(
        coalesce(
          p_event -> 'days_of_week',
          '[]'::jsonb
        )
      )
    ),
    (p_event ->> 'day_of_month')::smallint,
    (p_event ->> 'starts_on')::date,
    (p_event ->> 'ends_on')::date,
    (p_event ->> 'default_start_time')::time,
    (p_event ->> 'duration_minutes')::integer,
    p_event ->> 'timezone',
    v_user_id,
    v_user_id
  )
  returning id into v_event_id;

  for v_session in
    select value
    from jsonb_array_elements(p_sessions)
  loop
    insert into public.event_sessions (
      event_id,
      session_date,
      starts_at,
      ends_at,
      status,
      created_by,
      updated_by
    )
    values (
      v_event_id,
      (v_session ->> 'session_date')::date,
      (v_session ->> 'starts_at')::timestamptz,
      (v_session ->> 'ends_at')::timestamptz,
      coalesce(
        (v_session ->> 'status')::public.event_session_status,
        'scheduled'::public.event_session_status
      ),
      v_user_id,
      v_user_id
    );
  end loop;

  return v_event_id;
end;
$$;

revoke all
on function public.create_event_with_sessions(jsonb, jsonb)
from public;

revoke all
on function public.create_event_with_sessions(jsonb, jsonb)
from anon;

grant execute
on function public.create_event_with_sessions(jsonb, jsonb)
to authenticated;