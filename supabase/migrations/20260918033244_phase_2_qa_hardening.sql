-- =========================================================
-- PHASE 2 / #30
-- QA + Database Hardening
-- Ecclesia Flow
-- =========================================================

-- Audit foreign-key indexes
create index if not exists members_created_by_idx
  on public.members (created_by);

create index if not exists members_updated_by_idx
  on public.members (updated_by);

-- ---------------------------------------------------------
-- Consolidate profile SELECT policies
-- ---------------------------------------------------------

drop policy if exists
  "Admins can read all profiles"
on public.profiles;

drop policy if exists
  "Staff can read own profile"
on public.profiles;

create policy
  "Staff can read permitted profiles"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_active_admin())
);