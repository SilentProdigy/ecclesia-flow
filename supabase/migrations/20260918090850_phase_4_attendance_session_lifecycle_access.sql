create or replace function private.protect_event_session_staff_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select private.is_active_admin()) then
    return new;
  end if;

  if not (select private.is_active_staff()) then
    raise exception
      'Only active staff can update an attendance session.';
  end if;

  if new.id is distinct from old.id
    or new.event_id is distinct from old.event_id
    or new.session_date is distinct from old.session_date
    or new.starts_at is distinct from old.starts_at
    or new.ends_at is distinct from old.ends_at
    or new.title_override is distinct from old.title_override
    or new.location_override is distinct from old.location_override
    or new.notes is distinct from old.notes
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then
    raise exception
      'Staff can only change the attendance session status.';
  end if;

  if new.status is distinct from old.status then
    if not (
      (
        old.status =
          'scheduled'::public.event_session_status
        and
        new.status =
          'open'::public.event_session_status
      )
      or
      (
        old.status =
          'open'::public.event_session_status
        and
        new.status =
          'completed'::public.event_session_status
      )
    ) then
      raise exception
        'Invalid attendance session status transition.';
    end if;
  end if;

  new.updated_by :=
    (select auth.uid());

  return new;
end;
$$;

revoke all
on function private.protect_event_session_staff_update()
from public;

revoke all
on function private.protect_event_session_staff_update()
from anon;

revoke all
on function private.protect_event_session_staff_update()
from authenticated;

drop trigger if exists
  protect_event_session_staff_update
on public.event_sessions;

create trigger protect_event_session_staff_update
before update
on public.event_sessions
for each row
execute function private.protect_event_session_staff_update();

drop policy if exists
  "Active staff can manage attendance session status"
on public.event_sessions;

create policy
  "Active staff can manage attendance session status"
on public.event_sessions
for update
to authenticated
using (
  (select private.is_active_staff())
)
with check (
  (select private.is_active_staff())
);