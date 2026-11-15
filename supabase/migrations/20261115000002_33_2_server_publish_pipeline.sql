-- ============================================================================
-- Migration 20261115000002 — Phase 33 task 33.2
-- Server-side publish pipeline: only the `publish-meme` Edge Function (service role)
-- can create memes or write files. The public can only READ approved memes and the
-- public `memes` / `meme-images` buckets.
--
-- Checked against the live project (read-only) on 15 Nov 2026:
--   * memes has no Phase 26 columns yet (media_type, poster_url, overlay, …) — added here.
--   * memes INSERT policy "Anyone can upload memes" with check (true) — dropped.
--   * storage: public INSERT policies on buckets `memes` and `meme-images` — dropped.
--
-- EXISTING MEMES ARE KEPT VISIBLE: the new `status` column is back-filled to 'approved'
-- for every row that exists when this runs; only rows inserted afterwards default to
-- 'pending'.
--
-- Safe to run more than once. Run AFTER 20261115000001.
-- Deploy the function too (see instructions.md task 33.2), otherwise posting fails
-- (uploads are also switched off by PUBLIC_UPLOADS_ENABLED until 33.3 is live).
-- ============================================================================

-- 1. Columns --------------------------------------------------------------------
alter table public.memes add column if not exists media_type text not null default 'image';
alter table public.memes add column if not exists poster_url text;
alter table public.memes add column if not exists duration_sec numeric;
alter table public.memes add column if not exists width integer;
alter table public.memes add column if not exists height integer;
alter table public.memes add column if not exists overlay jsonb;
alter table public.memes add column if not exists base_image_url text;
alter table public.memes add column if not exists sha256 text;
alter table public.memes add column if not exists phash text;
alter table public.memes add column if not exists moderation jsonb;
alter table public.memes add column if not exists removed_reason text;

-- status: add with default 'approved' (back-fills existing rows), then switch the default.
alter table public.memes add column if not exists status text not null default 'approved';
alter table public.memes alter column status set default 'pending';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.memes'::regclass and conname = 'memes_status_check'
  ) then
    alter table public.memes
      add constraint memes_status_check
      check (status in ('pending', 'approved', 'rejected', 'removed'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.memes'::regclass and conname = 'memes_media_type_check'
  ) then
    alter table public.memes
      add constraint memes_media_type_check
      check (media_type in ('image', 'gif', 'video'));
  end if;
end
$$;

create index if not exists memes_status_created_idx on public.memes (status, created_at desc);
create index if not exists memes_sha256_idx on public.memes (sha256) where sha256 is not null;
create index if not exists memes_user_id_idx on public.memes (user_id) where user_id is not null;

-- 2. memes row-level security -----------------------------------------------------
alter table public.memes enable row level security;

-- Drop every existing INSERT and SELECT policy (looked up, because the schema file is
-- not a reliable record of the live DB — audit F14).
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'memes' and cmd in ('INSERT', 'SELECT', 'ALL')
  loop
    execute format('drop policy if exists %I on public.memes', pol.policyname);
  end loop;
end
$$;

-- Everyone sees approved memes; an uploader also sees their own pending/rejected ones.
create policy "Approved memes are public; authors see their own"
  on public.memes for select
  using (status = 'approved' or (auth.uid() is not null and user_id = auth.uid()));

-- No INSERT policy: only the service role (publish-meme) can insert.
-- (UPDATE = author-only and no DELETE, from migration 20261115000001.)

-- 3. Extend the protected-column guard from 33.1 with the new server-owned columns.
create or replace function public.memes_guard_protected_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  col text;
  protected_cols constant text[] := array[
    'image_url', 'poster_url', 'base_image_url', 'author_name', 'user_id', 'score', 'status',
    'sha256', 'phash', 'moderation', 'removed_reason', 'media_type', 'width', 'height',
    'duration_sec', 'parent_meme_id', 'root_meme_id', 'generation', 'created_at'
  ];
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  foreach col in array protected_cols loop
    if (to_jsonb(new) -> col) is distinct from (to_jsonb(old) -> col) then
      raise exception 'Column "%" of public.memes can only be changed by the server', col
        using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

-- 4. Storage buckets ----------------------------------------------------------------
-- Private quarantine bucket: files land here via server-signed upload URLs only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quarantine', 'quarantine', false, 15728640,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/octet-stream']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The public bucket only ever receives the function's re-encoded output.
-- (Existing files of other types stay readable; this only limits new uploads.)
update storage.buckets
set allowed_mime_types = array['image/webp', 'image/gif'],
    file_size_limit = 15728640
where id = 'memes';

-- 5. Storage policies: the public may only READ `memes` / `meme-images`.
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (
        cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
        or coalesce(qual, '') like '%quarantine%'
        or coalesce(with_check, '') like '%quarantine%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;
end
$$;

-- Re-assert read access for the two public buckets (no-op if the policies already exist).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd = 'SELECT'
      and coalesce(qual, '') like '%''memes''%'
  ) then
    create policy "Public can read memes bucket"
      on storage.objects for select
      using (bucket_id = 'memes');
  end if;
end
$$;

-- No INSERT / UPDATE / DELETE policy on storage.objects for anyone but the service role.
