-- =========================================================
-- PHASE 2 / #22
-- Member Photo Storage
-- Ecclesia Flow
-- =========================================================

-- ---------------------------------------------------------
-- Private member photos bucket
-- ---------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'member-photos',
  'member-photos',
  false,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------
-- Storage RLS
-- ---------------------------------------------------------

create policy "Active staff can read member photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-photos'
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
  )
);

create policy "Active staff can upload member photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-photos'
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
  )
  and storage.extension(name) in (
    'jpg',
    'jpeg',
    'png',
    'webp'
  )
);

create policy "Active staff can update member photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'member-photos'
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
  )
)
with check (
  bucket_id = 'member-photos'
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
  )
  and storage.extension(name) in (
    'jpg',
    'jpeg',
    'png',
    'webp'
  )
);

create policy "Active staff can delete member photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'member-photos'
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
  )
);