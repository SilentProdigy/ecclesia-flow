create index if not exists events_created_by_idx
  on public.events (created_by);

create index if not exists events_updated_by_idx
  on public.events (updated_by);

create index if not exists event_sessions_created_by_idx
  on public.event_sessions (created_by);

create index if not exists event_sessions_updated_by_idx
  on public.event_sessions (updated_by);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all
on function public.set_updated_at()
from public;

revoke all
on function public.set_updated_at()
from anon;

revoke all
on function public.set_updated_at()
from authenticated;

drop policy if exists "Active staff can read events"
on public.events;

drop policy if exists "Active admins can create events"
on public.events;

drop policy if exists "Active admins can update events"
on public.events;

create policy "Active staff can read events"
on public.events
for select
to authenticated
using (
  (select private.is_active_staff())
);

create policy "Active admins can create events"
on public.events
for insert
to authenticated
with check (
  (select private.is_active_admin())
);

create policy "Active admins can update events"
on public.events
for update
to authenticated
using (
  (select private.is_active_admin())
)
with check (
  (select private.is_active_admin())
);

drop policy if exists "Active staff can read event sessions"
on public.event_sessions;

drop policy if exists "Active admins can create event sessions"
on public.event_sessions;

drop policy if exists "Active admins can delete event sessions"
on public.event_sessions;

create policy "Active staff can read event sessions"
on public.event_sessions
for select
to authenticated
using (
  (select private.is_active_staff())
);

create policy "Active admins can create event sessions"
on public.event_sessions
for insert
to authenticated
with check (
  (select private.is_active_admin())
);

create policy "Active admins can delete event sessions"
on public.event_sessions
for delete
to authenticated
using (
  (select private.is_active_admin())
);

alter function public.create_event_with_sessions(
  jsonb,
  jsonb
)
security invoker;

alter function public.create_event_with_sessions(
  jsonb,
  jsonb
)
set search_path = '';

alter function public.update_event_with_sessions(
  uuid,
  jsonb,
  jsonb,
  date
)
security invoker;

alter function public.update_event_with_sessions(
  uuid,
  jsonb,
  jsonb,
  date
)
set search_path = '';

revoke all
on function public.create_event_with_sessions(
  jsonb,
  jsonb
)
from public;

revoke all
on function public.create_event_with_sessions(
  jsonb,
  jsonb
)
from anon;

grant execute
on function public.create_event_with_sessions(
  jsonb,
  jsonb
)
to authenticated, service_role;

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
to authenticated, service_role;

revoke all
on table public.events
from anon;

revoke all
on table public.event_sessions
from anon;

revoke all
on table public.events
from authenticated;

revoke all
on table public.event_sessions
from authenticated;

grant select, insert, update
on table public.events
to authenticated;

grant select, insert, update, delete
on table public.event_sessions
to authenticated;

grant select, insert, update, delete
on table public.events
to service_role;

grant select, insert, update, delete
on table public.event_sessions
to service_role;