-- ============================================================================
-- Migration 20261115000003 — Phase 33 task 33.3 (automated image moderation)
--
--   1. banned_hashes: SHA-256 + 64-bit perceptual hash (dHash) of every rejected image
--      (and, from 33.5, every removed one). publish-meme checks it BEFORE calling the
--      moderation API, so exact and near-identical re-uploads are refused instantly.
--   2. is_banned_image(sha256, phash, max_distance): exact SHA match or dHash within
--      max_distance bits. Callable by the service role only.
--   3. moderation_incidents: a minimal log of zero-tolerance hits (suspected sexual content
--      involving minors). It holds hashes, the account id, provider and scores; NEVER the
--      image. What else must be kept or reported is the owner's legal procedure.
--
-- None of these tables has an RLS policy, so the public API cannot read or write them;
-- only the service role (publish-meme, moderators' server functions in 33.5) can.
-- Safe to run more than once.
-- ============================================================================

create table if not exists public.banned_hashes (
  id bigint generated always as identity primary key,
  sha256 text,
  phash text check (phash is null or phash ~ '^[0-9a-f]{16}$'),
  reason text not null default 'auto_reject',
  source text not null default 'publish-meme',
  meme_id uuid,
  created_at timestamptz not null default now(),
  constraint banned_hashes_has_hash check (sha256 is not null or phash is not null)
);
create unique index if not exists banned_hashes_sha256_key on public.banned_hashes (sha256) where sha256 is not null;
create index if not exists banned_hashes_phash_idx on public.banned_hashes (phash) where phash is not null;
alter table public.banned_hashes enable row level security;

create table if not exists public.moderation_incidents (
  id bigint generated always as identity primary key,
  kind text not null,
  user_id uuid,
  sha256 text,
  phash text,
  provider text,
  categories jsonb,
  status text not null default 'open' check (status in ('open', 'reported', 'closed')),
  created_at timestamptz not null default now()
);
alter table public.moderation_incidents enable row level security;

create or replace function public.is_banned_image(p_sha256 text, p_phash text, p_max_distance integer default 6)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.banned_hashes b
    where (p_sha256 is not null and b.sha256 = p_sha256)
       or (
         p_phash ~ '^[0-9a-f]{16}$'
         and b.phash is not null
         -- an all-zero / all-one dHash means a flat colour image: too generic to match on
         and p_phash not in ('0000000000000000', 'ffffffffffffffff')
         and bit_count(('x' || b.phash)::bit(64) # ('x' || p_phash)::bit(64)) <= greatest(0, least(p_max_distance, 16))
       )
  );
$$;

revoke all on function public.is_banned_image(text, text, integer) from public, anon, authenticated;
grant execute on function public.is_banned_image(text, text, integer) to service_role;

revoke all on table public.banned_hashes from anon, authenticated;
revoke all on table public.moderation_incidents from anon, authenticated;
