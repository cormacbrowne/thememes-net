-- ============================================================================
-- Migration 20260101000000 — Baseline pre-Phase 33 schema (reconstructed from live DB)
--
-- Exists so `supabase/migrations/` is a single, self-contained source of truth
-- that builds the full schema on a clean Postgres / staging Supabase project
-- when executed sequentially from 00_initial_schema through 33_12+.
-- ============================================================================

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- 1. public.memes (pre-Phase 33 columns) --------------------------------------
create table if not exists public.memes (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text default 'shitpost',
  image_url text not null,
  author_name text default 'AnonMemer',
  user_id uuid references auth.users(id),
  score integer default 1,
  reactions jsonb default '{"🔥": 0, "💀": 0, "😂": 0, "🗿": 0}'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  parent_meme_id uuid references public.memes(id) on delete set null,
  root_meme_id uuid references public.memes(id) on delete set null,
  generation integer default 0 not null,
  mutation_count integer default 0 not null
);

create index if not exists idx_memes_parent_id on public.memes (parent_meme_id);
create index if not exists idx_memes_root_id on public.memes (root_meme_id);

alter table public.memes enable row level security;

-- 2. public.comments (pre-Phase 33 columns) -----------------------------------
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  meme_id uuid references public.memes(id) on delete cascade not null,
  author_name text not null,
  body text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.comments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'comments' and cmd = 'SELECT'
  ) then
    create policy "Comments are viewable by everyone"
      on public.comments for select
      using (true);
  end if;
end
$$;

-- 3. Pre-Phase 33 storage buckets & public read policies ----------------------
insert into storage.buckets (id, name, public)
values
  ('memes', 'memes', true),
  ('meme-images', 'meme-images', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Public read access for meme images'
  ) then
    create policy "Public read access for meme images"
      on storage.objects for select
      using (bucket_id = 'meme-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and coalesce(qual, '') like '%''memes''%'
      and cmd = 'SELECT'
  ) then
    create policy "Public can read memes bucket"
      on storage.objects for select
      using (bucket_id = 'memes');
  end if;
end
$$;

-- 4. Lineage trigger & legacy baseline functions (hardened in 33.1 / 33.8 / 33.12)
create or replace function public.handle_new_meme_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_gen integer;
  v_parent_root uuid;
begin
  if new.parent_meme_id is not null then
    select generation, coalesce(root_meme_id, id)
    into v_parent_gen, v_parent_root
    from public.memes
    where id = new.parent_meme_id;

    new.generation := coalesce(v_parent_gen, 0) + 1;
    new.root_meme_id := v_parent_root;

    update public.memes
    set mutation_count = coalesce(mutation_count, 0) + 1
    where id = new.parent_meme_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_on_meme_mutation on public.memes;
create trigger trg_on_meme_mutation
  before insert on public.memes
  for each row
  execute function public.handle_new_meme_mutation();

create or replace function public.increment_meme_score(row_id uuid, delta integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.memes
  set score = coalesce(score, 0) + greatest(-5, least(5, coalesce(delta, 0)))
  where id = row_id;
end;
$$;
