-- ============================================================================
-- Migration 20261115000015 — Phase 33 task 33.16
-- Feed that goes all the way back:
--   1. Keyset/cursor indexes on public.memes & public.comments.
--   2. SQL View public.memes_feed_view (security_invoker = true) computing
--      time-decayed hot_score and visible comments_count without fetching
--      comments(*) with the feed.
-- ============================================================================

create index if not exists memes_approved_created_id_idx
  on public.memes (created_at desc, id desc)
  where status = 'approved';

create index if not exists memes_approved_score_created_id_idx
  on public.memes (score desc, created_at desc, id desc)
  where status = 'approved';

create index if not exists memes_approved_category_created_id_idx
  on public.memes (category, created_at desc, id desc)
  where status = 'approved';

create index if not exists comments_meme_visible_created_idx
  on public.comments (meme_id, created_at asc)
  where status = 'visible';

create or replace view public.memes_feed_view
with (security_invoker = true)
as
select
  m.id,
  m.title,
  m.category,
  m.image_url,
  m.author_name,
  m.user_id,
  m.score,
  m.base_score,
  m.reactions,
  m.base_reactions,
  m.parent_meme_id,
  m.root_meme_id,
  m.generation,
  m.mutation_count,
  m.media_type,
  m.poster_url,
  m.base_image_url,
  m.duration_sec,
  m.width,
  m.height,
  m.overlay,
  m.is_bounty,
  m.bounty_id,
  m.status,
  m.created_at,
  round(
    (
      ((greatest(m.score, 0) + 1)::double precision)
      / power((greatest(extract(epoch from (now() - m.created_at)) / 3600.0, 0.0) + 2.0), 1.5)
    )::numeric,
    6
  )::double precision as hot_score,
  coalesce(
    (
      select count(*)::integer
      from public.comments c
      where c.meme_id = m.id
        and c.status = 'visible'
    ),
    0
  ) as comments_count
from public.memes m;

grant select on public.memes_feed_view to anon, authenticated;
