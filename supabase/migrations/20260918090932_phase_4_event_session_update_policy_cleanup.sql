drop policy if exists
  "Active admins can update event sessions"
on public.event_sessions;

drop policy if exists
  "Active staff can manage attendance session status"
on public.event_sessions;

create policy
  "Active staff can update event sessions"
on public.event_sessions
for update
to authenticated
using (
  (select private.is_active_staff())
)
with check (
  (select private.is_active_staff())
);