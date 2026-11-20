-- ============================================================================
-- Migration 20261120000001 — Plan Phase 1.1 "Real numbers only"
--
-- Every vote / reaction number shown on the site must come from real rows in
-- public.votes and public.reactions. Until now memes.score = base_score + votes,
-- and base_score / base_reactions held old client-side bumps frozen in by 33.8
-- (plus a default of 1, so every new meme showed one upvote nobody cast).
--
-- This migration:
--   1. Backs up every meme's current score / base_score / reactions / base_reactions
--      into public.meme_count_baseline_backup (REVERSIBLE: see the DOWN block below).
--   2. Sets base_score = 0 and base_reactions = all zeros, then recomputes score and
--      reactions purely from public.votes / public.reactions.
--   3. Changes the column defaults to 0 and adds a BEFORE INSERT trigger so a new
--      meme always starts at 0 / zeros, whatever the inserting code sends.
--
-- DOWN (to undo, run by hand):
--   drop trigger if exists trg_memes_real_counts_on_insert on public.memes;
--   update public.memes m set base_score = b.base_score, base_reactions = b.base_reactions,
--     score = b.score, reactions = b.reactions
--   from public.meme_count_baseline_backup b where b.meme_id = m.id;
--   alter table public.memes alter column base_score set default 1;
--   alter table public.memes alter column score set default 1;
-- ============================================================================

create table if not exists public.meme_count_baseline_backup (
  meme_id uuid primary key references public.memes(id) on delete cascade,
  score integer not null,
  base_score integer not null,
  reactions jsonb,
  base_reactions jsonb,
  backed_up_at timestamptz not null default now()
);

alter table public.meme_count_baseline_backup enable row level security;
-- No policies: service role / migrations only.
revoke all on public.meme_count_baseline_backup from anon, authenticated;

insert into public.meme_count_baseline_backup (meme_id, score, base_score, reactions, base_reactions)
select id, score, base_score, reactions, base_reactions
from public.memes
on conflict (meme_id) do nothing;

update public.memes m
set base_score = 0,
    base_reactions = '{"🔥": 0, "💀": 0, "😂": 0, "🗿": 0}'::jsonb,
    score = coalesce((
      select sum(v.direction)::integer from public.votes v where v.meme_id = m.id
    ), 0),
    reactions = jsonb_build_object(
      '🔥', (select count(*) from public.reactions r where r.meme_id = m.id and r.active and r.emoji = '🔥'),
      '💀', (select count(*) from public.reactions r where r.meme_id = m.id and r.active and r.emoji = '💀'),
      '😂', (select count(*) from public.reactions r where r.meme_id = m.id and r.active and r.emoji = '😂'),
      '🗿', (select count(*) from public.reactions r where r.meme_id = m.id and r.active and r.emoji = '🗿')
    );

alter table public.memes alter column base_score set default 0;
alter table public.memes alter column score set default 0;
alter table public.memes alter column base_reactions set default '{"🔥": 0, "💀": 0, "😂": 0, "🗿": 0}'::jsonb;

create or replace function public.memes_real_counts_on_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.base_score := 0;
  new.score := 0;
  new.base_reactions := '{"🔥": 0, "💀": 0, "😂": 0, "🗿": 0}'::jsonb;
  new.reactions := '{"🔥": 0, "💀": 0, "😂": 0, "🗿": 0}'::jsonb;
  return new;
end;
$$;

drop trigger if exists trg_memes_real_counts_on_insert on public.memes;
create trigger trg_memes_real_counts_on_insert
  before insert on public.memes
  for each row
  execute function public.memes_real_counts_on_insert();
