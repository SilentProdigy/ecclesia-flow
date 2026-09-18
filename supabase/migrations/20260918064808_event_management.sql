create or replace function public.update_event_with_sessions(
  p_event_id uuid,
  p_event jsonb,
  p_sessions jsonb default '[]'::jsonb,
  p_regenerate_from date default current_date
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_session jsonb;
  v_session_date date;
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

  if not exists (
    select 1
    from public.events
    where id = p_event_id
  ) then
    raise exception 'Event not found.';
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

  update public.events
  set
    name = trim(p_event ->> 'name'),
    description = nullif(
      trim(
        coalesce(
          p_event ->> 'description',
          ''
        )
      ),
      ''
    ),
    event_type = (
      p_event ->> 'event_type'
    )::public.event_type,
    location = nullif(
      trim(
        coalesce(
          p_event ->> 'location',
          ''
        )
      ),
      ''
    ),
    status = (
      p_event ->> 'status'
    )::public.event_status,
    recurrence = (
      p_event ->> 'recurrence'
    )::public.event_recurrence,
    recurrence_interval = (
      p_event ->> 'recurrence_interval'
    )::integer,
    days_of_week = array(
      select value::smallint
      from jsonb_array_elements_text(
        coalesce(
          p_event -> 'days_of_week',
          '[]'::jsonb
        )
      )
    ),
    day_of_month = (
      p_event ->> 'day_of_month'
    )::smallint,
    starts_on = (
      p_event ->> 'starts_on'
    )::date,
    ends_on = (
      p_event ->> 'ends_on'
    )::date,
    default_start_time = (
      p_event ->> 'default_start_time'
    )::time,
    duration_minutes = (
      p_event ->> 'duration_minutes'
    )::integer,
    timezone = p_event ->> 'timezone',
    updated_by = v_user_id
  where id = p_event_id;

  delete from public.event_sessions
  where event_id = p_event_id
    and session_date >= p_regenerate_from
    and status = 'scheduled'
    and title_override is null
    and location_override is null
    and notes is null;

  for v_session in
    select value
    from jsonb_array_elements(
      p_sessions
    )
  loop
    v_session_date :=
      (
        v_session ->> 'session_date'
      )::date;

    if not exists (
      select 1
      from public.event_sessions
      where event_id = p_event_id
        and session_date = v_session_date
    ) then
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
        p_event_id,
        v_session_date,
        (
          v_session ->> 'starts_at'
        )::timestamptz,
        (
          v_session ->> 'ends_at'
        )::timestamptz,
        coalesce(
          (
            v_session ->> 'status'
          )::public.event_session_status,
          'scheduled'::public.event_session_status
        ),
        v_user_id,
        v_user_id
      )
      on conflict (
        event_id,
        starts_at
      ) do nothing;
    end if;
  end loop;
end;
$$;

revoke all
on function public.update_event_with_sessions(
  uuid,
  jsonb,
  jsonb,
  date
)
from public;

revoke all
on function public.update_event_with_sessions(
  uuid,
  jsonb,
  jsonb,
  date
)
from anon;

grant execute
on function public.update_event_with_sessions(
  uuid,
  jsonb,
  jsonb,
  date
)
to authenticated;