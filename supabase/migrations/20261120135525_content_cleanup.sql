-- ============================================================================
-- Migration 20261120000002 — Plan Phase 1.2 "Clean up content"
--
-- Owner-approved (20 Nov 2026):
--   1. Hide test posts from public feeds: the TestOne and AnonMemer memes that are still
--      approved. Hidden = status 'removed' (reversible), nothing is deleted.
--   2. Remix titles: strip stacked "REMIX: " prefixes. The remix link is parent_meme_id.
--   3. Typo: "Nobody knows who’s plan" → "Nobody knows whose plan".
--
-- Every changed row's old title / status / removed_reason is backed up first in
-- public.meme_content_cleanup_backup.
--
-- DOWN (to undo, run by hand):
--   update public.memes m set title = b.title, status = b.status, removed_reason = b.removed_reason
--   from public.meme_content_cleanup_backup b where b.meme_id = m.id;
-- ============================================================================

create table if not exists public.meme_content_cleanup_backup (
  meme_id uuid primary key references public.memes(id) on delete cascade,
  title text,
  status text,
  removed_reason text,
  backed_up_at timestamptz not null default now()
);

alter table public.meme_content_cleanup_backup enable row level security;
revoke all on public.meme_content_cleanup_backup from anon, authenticated;

insert into public.meme_content_cleanup_backup (meme_id, title, status, removed_reason)
select id, title, status, removed_reason
from public.memes
where title ~* '^\s*remix:'
   or title ilike '%who’s plan%'
   or title ilike '%who''s plan%'
   or (status = 'approved' and author_name in ('TestOne', 'AnonMemer'))
on conflict (meme_id) do nothing;

-- 1. Hide test posts (reversible).
update public.memes
set status = 'removed',
    removed_reason = 'Test content hidden by owner (20 Nov 2026)'
where status = 'approved'
  and author_name in ('TestOne', 'AnonMemer');

-- 2. Strip every leading "REMIX: " (stacked or not).
update public.memes
set title = regexp_replace(title, '^(\s*remix:\s*)+', '', 'i')
where title ~* '^\s*remix:';

-- 3. Typo.
update public.memes
set title = replace(replace(title, 'who’s plan', 'whose plan'), 'who''s plan', 'whose plan')
where title ilike '%who’s plan%' or title ilike '%who''s plan%';
