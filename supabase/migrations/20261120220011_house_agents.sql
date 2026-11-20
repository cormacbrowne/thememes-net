-- ============================================================================
-- Workstream 1 — House agents ("Never look empty")
--
--   profiles.is_house                 the ONE labelled AI account (MemeBot). Never a fake human.
--   caption_battle_entries.is_house   house seed entries (MemeBot may post up to N per battle)
--   agent_settings / agent_runs       kill switch, review mode, caps, budget; one log row per run
--   close_battle()                    house entries are never ranked, awarded or crowned
--   get_weekly_leaderboards()         house excluded from every board
--   memes_feed_view.hot_score         (reactions + 2*comments + 1) / (hours + 2)^1.5
--   get_hot_feed()                    Hot tab: server-ranked, at most 1 house meme in any 4 cards
--   bounties / bounty_awards          weekly bounty written by the agent; 100 M$ to best human
--   admin_house_queue / _decide       review flow while agent_settings.review_mode is on
--   moderation_digest_send()          + house section (pending items, yesterday's runs, tokens)
--
-- Cron jobs are NOT scheduled here (see the later *_house_agent_cron.sql migration).
-- ============================================================================

-- ---------------------------------------------------------------- identity
alter table public.profiles
  add column if not exists is_house boolean not null default false;
create index if not exists profiles_is_house_idx on public.profiles (id) where is_house;

alter table public.caption_battle_entries
  add column if not exists is_house boolean not null default false;

-- One entry per HUMAN per battle; the house account may post several seed entries.
drop index if exists public.caption_battle_entries_one_per_user_idx;
create unique index caption_battle_entries_one_per_user_idx
  on public.caption_battle_entries (battle_id, user_id)
  where battle_id is not null and not is_house;

-- Profiles are not publicly readable, so feed views use this definer helper.
create or replace function public.is_house_user(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_house from public.profiles p where p.id = p_uid), false);
$$;
revoke all on function public.is_house_user(uuid) from public;
grant execute on function public.is_house_user(uuid) to anon, authenticated, service_role;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

-- ---------------------------------------------------------------- settings & log
create table if not exists public.agent_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  review_mode boolean not null default true,
  memes_per_day integer not null default 6 check (memes_per_day between 0 and 30),
  battle_seed_entries integer not null default 3 check (battle_seed_entries between 0 and 10),
  bounty_enabled boolean not null default true,
  bounty_prize_mdollarz integer not null default 100 check (bounty_prize_mdollarz between 0 and 100),
  daily_token_budget integer not null default 200000 check (daily_token_budget between 0 and 5000000),
  blocked_topics text[] not null default '{}',
  updated_at timestamptz not null default now()
);
insert into public.agent_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.agent_runs (
  id bigint generated always as identity primary key,
  task text not null check (task in ('daily_memes', 'seed_battle', 'weekly_bounty')),
  run_key text not null unique,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'ok', 'skipped', 'error')),
  items_created integer not null default 0,
  tokens_used integer not null default 0,
  error text,
  details jsonb not null default '{}'::jsonb
);
create index if not exists agent_runs_started_idx on public.agent_runs (started_at desc);

alter table public.agent_settings enable row level security;
alter table public.agent_runs enable row level security;
revoke all on table public.agent_settings from anon, authenticated;
revoke all on table public.agent_runs from anon, authenticated;
drop policy if exists "Admins read agent settings" on public.agent_settings;
create policy "Admins read agent settings" on public.agent_settings for select to authenticated using (public.is_admin());
drop policy if exists "Admins read agent runs" on public.agent_runs;
create policy "Admins read agent runs" on public.agent_runs for select to authenticated using (public.is_admin());
grant select on public.agent_settings, public.agent_runs to authenticated;

create or replace function public.admin_get_agent_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  return jsonb_build_object(
    'ok', true,
    'settings', (select to_jsonb(s) - 'id' from public.agent_settings s where s.id),
    'runs', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.started_at desc)
      from (select * from public.agent_runs order by started_at desc limit 40) r
    ), '[]'::jsonb),
    'tokens_today', (
      select coalesce(sum(tokens_used), 0) from public.agent_runs
      where started_at >= (date_trunc('day', now() at time zone 'Europe/London') at time zone 'Europe/London')
    )
  );
end;
$$;
revoke all on function public.admin_get_agent_settings() from public;
grant execute on function public.admin_get_agent_settings() to authenticated;

create or replace function public.admin_update_agent_settings(p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.agent_settings%rowtype;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  update public.agent_settings s set
    enabled = coalesce((p_patch ->> 'enabled')::boolean, s.enabled),
    review_mode = coalesce((p_patch ->> 'review_mode')::boolean, s.review_mode),
    memes_per_day = coalesce((p_patch ->> 'memes_per_day')::integer, s.memes_per_day),
    battle_seed_entries = coalesce((p_patch ->> 'battle_seed_entries')::integer, s.battle_seed_entries),
    bounty_enabled = coalesce((p_patch ->> 'bounty_enabled')::boolean, s.bounty_enabled),
    bounty_prize_mdollarz = coalesce((p_patch ->> 'bounty_prize_mdollarz')::integer, s.bounty_prize_mdollarz),
    daily_token_budget = coalesce((p_patch ->> 'daily_token_budget')::integer, s.daily_token_budget),
    blocked_topics = case when p_patch ? 'blocked_topics'
      then coalesce(array(
        select left(lower(btrim(t)), 60) from jsonb_array_elements_text(p_patch -> 'blocked_topics') t
        where btrim(t) <> '' limit 200
      ), '{}') else s.blocked_topics end,
    updated_at = now()
  where s.id
  returning * into v_row;
  insert into public.moderation_actions (moderator_id, action, note)
  values (auth.uid(), 'agent_settings', left(p_patch::text, 300));
  return jsonb_build_object('ok', true, 'settings', to_jsonb(v_row) - 'id');
end;
$$;
revoke all on function public.admin_update_agent_settings(jsonb) from public;
grant execute on function public.admin_update_agent_settings(jsonb) to authenticated;

-- ---------------------------------------------------------------- battles: humans only win
create or replace function public.close_battle(p_battle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.battles%rowtype;
  v_prizes jsonb;
  v_top record;
begin
  select * into v_b from public.battles where id = p_battle_id for update;
  if not found or v_b.status not in ('live', 'judging') then
    return;
  end if;
  update public.battles set status = 'judging' where id = p_battle_id;

  -- House entries can be voted on but are never ranked, so they can't take a podium place.
  -- If a house entry had the most votes, the best HUMAN entry is #1. No humans → no winner.
  update public.caption_battle_entries set rank = null
  where battle_id = p_battle_id and is_house;

  update public.caption_battle_entries e
  set rank = r.rnk
  from (
    select id, row_number() over (order by score desc, created_at asc) as rnk
    from public.caption_battle_entries
    where battle_id = p_battle_id and status = 'approved' and not is_house
      and not public.is_house_user(user_id)
  ) r
  where e.id = r.id;

  select s.prizes into v_prizes from public.battle_settings s where s.id;

  insert into public.battle_awards (battle_id, user_id, entry_id, rank, badge, mdollarz)
  select p_battle_id, e.user_id, e.id, e.rank,
         coalesce(pz.p ->> 'badge', 'podium_finish'), coalesce((pz.p ->> 'mdollarz')::integer, 0)
  from public.caption_battle_entries e
  join lateral (
    select x as p from jsonb_array_elements(v_prizes) x where (x ->> 'rank')::integer = e.rank limit 1
  ) pz on true
  where e.battle_id = p_battle_id and e.status = 'approved' and not e.is_house and e.rank between 1 and 3
  on conflict (battle_id, user_id) do nothing;

  select e.* into v_top
  from public.caption_battle_entries e
  where e.battle_id = p_battle_id and e.status = 'approved' and not e.is_house and e.rank = 1;

  if found then
    insert into public.caption_battle_winners (
      battle_date, battle_id, entry_id, user_id, author_name, template_id, image_url,
      top_text, bottom_text, winning_score, crowned_until
    ) values (
      v_b.battle_day, p_battle_id, v_top.id, v_top.user_id, v_top.author_name,
      coalesce(v_b.template_id, 'custom'), v_b.image_url,
      v_top.top_text, v_top.bottom_text, greatest(0, v_top.score), v_b.ends_at + interval '24 hours'
    )
    on conflict (battle_date) do nothing;
  end if;

  update public.battles set status = 'complete', closed_at = now() where id = p_battle_id;
end;
$$;
revoke all on function public.close_battle(uuid) from public;
grant execute on function public.close_battle(uuid) to service_role;

-- ---------------------------------------------------------------- leaderboards: no house
create or replace function public.get_weekly_leaderboards(p_limit integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lim integer := greatest(1, least(coalesce(p_limit, 20), 50));
  v_week_start_local timestamp := date_trunc('week', timezone('Europe/London', now()));
  v_week_start timestamptz := v_week_start_local at time zone 'Europe/London';
  v_week_end timestamptz := (v_week_start_local + interval '7 days') at time zone 'Europe/London';
  v_week_start_date date := v_week_start_local::date;
  v_top_creators jsonb := '[]'::jsonb;
  v_battle_points jsonb := '[]'::jsonb;
  v_daily_puzzle jsonb := '[]'::jsonb;
  v_hall_of_fame jsonb := '[]'::jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into v_top_creators
  from (
    select
      m.author_name as handle,
      max(p.avatar_id) as avatar_id,
      count(*)::integer as memes_count,
      coalesce(sum(greatest(0, m.score)), 0)::integer as upvotes
    from public.memes m
    left join public.profiles p on p.id = m.user_id
    where m.status = 'approved'
      and m.created_at >= v_week_start
      and m.created_at < v_week_end
      and m.author_name is not null
      and not coalesce(p.is_house, false)
    group by m.author_name
    order by upvotes desc, memes_count desc, m.author_name asc
    limit v_lim
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into v_battle_points
  from (
    with raw_pts as (
      select
        e.user_id,
        coalesce(nullif(p.username, ''), e.author_name, 'AnonMemer') as handle,
        p.avatar_id,
        (10 + greatest(0, coalesce(e.score, 0)))::integer as pts,
        1 as entries_cnt,
        0 as wins_cnt
      from public.caption_battle_entries e
      left join public.profiles p on p.id = e.user_id
      where coalesce(e.status, 'approved') <> 'removed'
        and not e.is_house
        and not coalesce(p.is_house, false)
        and e.created_at >= v_week_start
        and e.created_at < v_week_end
      union all
      select
        a.user_id,
        coalesce(nullif(p.username, ''), 'Anon_' || left(a.user_id::text, 6)) as handle,
        p.avatar_id,
        case a.rank when 1 then 50 when 2 then 30 when 3 then 15 else 0 end as pts,
        0 as entries_cnt,
        case when a.rank = 1 then 1 else 0 end as wins_cnt
      from public.battle_awards a
      left join public.profiles p on p.id = a.user_id
      where a.created_at >= v_week_start
        and a.created_at < v_week_end
        and not coalesce(p.is_house, false)
    )
    select
      min(handle) as handle,
      max(avatar_id) as avatar_id,
      sum(pts)::integer as points,
      sum(entries_cnt)::integer as entries_count,
      sum(wins_cnt)::integer as wins_count
    from raw_pts
    group by lower(handle)
    order by points desc, wins_count desc, entries_count desc
    limit v_lim
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into v_daily_puzzle
  from (
    select
      coalesce(nullif(p.username, ''), 'Player_' || left(d.user_id::text, 6)) as handle,
      max(p.avatar_id) as avatar_id,
      sum(d.score)::integer as points,
      sum(d.solved)::integer as solved,
      count(*)::integer as days_played
    from public.daily_puzzle_results d
    left join public.profiles p on p.id = d.user_id
    where d.puzzle_date >= v_week_start_date
      and d.puzzle_date < (v_week_start_date + 7)
      and not coalesce(p.is_house, false)
    group by coalesce(nullif(p.username, ''), 'Player_' || left(d.user_id::text, 6))
    order by points desc, solved desc, days_played desc
    limit v_lim
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into v_hall_of_fame
  from (
    select
      w.author_name as handle,
      max(p.avatar_id) as avatar_id,
      count(*)::integer as wins,
      max(w.winning_score)::integer as best_score,
      (array_agg(w.image_url order by w.battle_date desc))[1] as latest_image_url,
      (array_agg(w.top_text order by w.battle_date desc))[1] as latest_top_text,
      (array_agg(w.bottom_text order by w.battle_date desc))[1] as latest_bottom_text,
      max(w.battle_date) as last_won_date
    from public.caption_battle_winners w
    left join public.profiles p on p.id = w.user_id
    where w.author_name is not null
      and not coalesce(p.is_house, false)
    group by w.author_name
    order by wins desc, best_score desc, last_won_date desc
    limit v_lim
  ) t;

  return jsonb_build_object(
    'ok', true,
    'week_start', v_week_start,
    'week_end', v_week_end,
    'reset_label', 'Resets Monday 00:00 Europe/London',
    'top_creators', v_top_creators,
    'battle_points', v_battle_points,
    'daily_puzzle', v_daily_puzzle,
    'hall_of_fame', v_hall_of_fame
  );
end;
$$;

-- ---------------------------------------------------------------- feed: engagement Hot score
-- Same columns in the same order (CREATE OR REPLACE VIEW), new hot_score, + reactions_total, is_house.
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
  round((
    (rx.total + 2 * cc.n + 1)::double precision
    / power(greatest(extract(epoch from (now() - m.created_at)) / 3600.0, 0.0)::double precision + 2.0, 1.5)
  )::numeric, 6)::double precision as hot_score,
  cc.n as comments_count,
  public.get_meme_upvotes_last_hour(m.id) as upvotes_last_hour,
  rx.total as reactions_total,
  public.is_house_user(m.user_id) as is_house
from public.memes m
cross join lateral (
  select count(*)::integer as n
  from public.comments c
  where c.meme_id = m.id and c.status = 'visible'
) cc
cross join lateral (
  select coalesce(sum(greatest(
    case when jsonb_typeof(r.value) = 'number' then (r.value #>> '{}')::numeric else 0 end, 0)), 0)::integer as total
  from jsonb_each(case when jsonb_typeof(m.reactions) = 'object' then m.reactions else '{}'::jsonb end) r
) rx;

grant select on public.memes_feed_view to anon, authenticated;

/**
 * Hot tab. Ranks approved memes by hot_score and then re-slots house memes so that any 4
 * consecutive cards hold at most 1 house meme (≥ 3 human cards between two house cards).
 * House meme k is placed after a_k human cards, a_k = max(natural_k, a_{k-1} + 3), i.e.
 * a_k = 3k + max_{j<=k}(natural_j - 3j). House memes that would need more humans than exist
 * are dropped. Offset paging (the score decays with time, so keyset cursors drift).
 * Returns jsonb rows with an extra `hot_rank` (1-based position).
 */
create or replace function public.get_hot_feed(
  p_category text default null,
  p_offset integer default 0,
  p_limit integer default 24
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with base as (
    select v.*
    from public.memes_feed_view v
    where v.status = 'approved'
      and (
        p_category is null or p_category in ('', 'all')
        or (p_category = 'remixes' and (v.mutation_count > 0 or v.parent_meme_id is not null))
        or v.category = p_category
      )
  ),
  ordered as (
    select b.*,
           row_number() over (order by b.hot_score desc, b.created_at desc, b.id desc) as overall_rn
    from base b
  ),
  humans as (
    select o.*, row_number() over (order by o.overall_rn) as hn
    from ordered o where not o.is_house
  ),
  houses as (
    select o.*,
           row_number() over (order by o.overall_rn) as k,
           (o.overall_rn - row_number() over (order by o.overall_rn)) as natural_before
    from ordered o where o.is_house
  ),
  house_slots as (
    select h.*,
           3 * h.k + max(h.natural_before - 3 * h.k) over (order by h.k rows unbounded preceding) as humans_before
    from houses h
  ),
  merged as (
    select to_jsonb(hu) - 'overall_rn' - 'hn' as row, hu.hn::numeric as sort_key from humans hu
    union all
    select to_jsonb(hs) - 'overall_rn' - 'k' - 'natural_before' - 'humans_before' as row,
           hs.humans_before + 0.5 as sort_key
    from house_slots hs
    where hs.humans_before <= (select count(*) from humans)
  ),
  paged as (
    select m.row, row_number() over (order by m.sort_key) as pos
    from merged m
  )
  select coalesce(jsonb_agg(p.row || jsonb_build_object('hot_rank', p.pos) order by p.pos), '[]'::jsonb)
  from paged p
  where p.pos > greatest(coalesce(p_offset, 0), 0)
    and p.pos <= greatest(coalesce(p_offset, 0), 0) + greatest(1, least(coalesce(p_limit, 24), 100));
$$;
revoke all on function public.get_hot_feed(text, integer, integer) from public;
grant execute on function public.get_hot_feed(text, integer, integer) to anon, authenticated, service_role;

-- ---------------------------------------------------------------- weekly bounty
create table if not exists public.bounties (
  id text primary key check (id ~ '^bounty-[a-z0-9-]{3,60}$'),
  tag text not null check (char_length(tag) between 2 and 32),
  prompt text not null check (char_length(prompt) between 8 and 160),
  category text not null default 'relatable',
  template_id text check (template_id is null or template_id ~ '^[a-z0-9-]{2,64}$'),
  image_url text check (image_url is null or image_url ~ '^/seed/[a-z0-9-]+\.webp$'),
  default_top text check (default_top is null or char_length(default_top) <= 120),
  default_bottom text check (default_bottom is null or char_length(default_bottom) <= 120),
  prize_mdollarz integer not null default 100 check (prize_mdollarz between 0 and 100),
  status text not null default 'pending' check (status in ('pending', 'active', 'closed', 'rejected')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  source text not null default 'house-agent' check (source in ('house-agent', 'admin')),
  moderation jsonb,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint bounties_window_check check (ends_at > starts_at and ends_at <= starts_at + interval '7 days')
);
create index if not exists bounties_status_ends_idx on public.bounties (status, ends_at);
alter table public.bounties enable row level security;
revoke insert, update, delete on public.bounties from anon, authenticated;
drop policy if exists "Active bounties are public" on public.bounties;
create policy "Active bounties are public" on public.bounties
  for select using (status in ('active', 'closed') or public.is_moderator());

create table if not exists public.bounty_awards (
  bounty_id text not null references public.bounties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  meme_id uuid references public.memes(id) on delete set null,
  mdollarz integer not null default 0 check (mdollarz between 0 and 100),
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (bounty_id, user_id)
);
alter table public.bounty_awards enable row level security;
revoke insert, update, delete on public.bounty_awards from anon, authenticated;
drop policy if exists "Players read their own bounty awards" on public.bounty_awards;
create policy "Players read their own bounty awards" on public.bounty_awards
  for select using (auth.uid() = user_id);

-- Close every bounty whose week is over: the best approved HUMAN entry wins the prize.
create or replace function public.close_due_bounties()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.bounties%rowtype;
  v_n integer := 0;
begin
  for v_b in
    select * from public.bounties where status = 'active' and ends_at <= now() for update skip locked
  loop
    insert into public.bounty_awards (bounty_id, user_id, meme_id, mdollarz)
    select v_b.id, m.user_id, m.id, v_b.prize_mdollarz
    from public.memes m
    where m.bounty_id = v_b.id and m.is_bounty and m.status = 'approved'
      and m.user_id is not null and not public.is_house_user(m.user_id)
      and m.created_at < v_b.ends_at
    order by m.score desc, m.created_at asc
    limit 1
    on conflict do nothing;
    update public.bounties set status = 'closed', closed_at = now() where id = v_b.id;
    v_n := v_n + 1;
  end loop;
  -- Never leave a stale (> 7 days) pending bounty lying around either.
  update public.bounties set status = 'rejected', closed_at = now()
  where status = 'pending' and ends_at <= now();
  return v_n;
end;
$$;
revoke all on function public.close_due_bounties() from public;
grant execute on function public.close_due_bounties() to service_role;

create or replace function public.get_active_bounty()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_b jsonb;
  v_award jsonb;
begin
  perform public.close_due_bounties();
  select to_jsonb(b) - 'moderation' into v_b
  from public.bounties b
  where b.status = 'active' and b.starts_at <= now() and b.ends_at > now()
    and b.ends_at <= now() + interval '7 days'
  order by b.starts_at desc
  limit 1;
  if v_uid is not null then
    select to_jsonb(a) || jsonb_build_object('prompt', b.prompt, 'tag', b.tag) into v_award
    from public.bounty_awards a join public.bounties b on b.id = a.bounty_id
    where a.user_id = v_uid and a.claimed_at is null
    order by a.created_at desc limit 1;
  end if;
  return jsonb_build_object('ok', true, 'bounty', v_b, 'my_award', v_award);
end;
$$;
revoke all on function public.get_active_bounty() from public;
grant execute on function public.get_active_bounty() to anon, authenticated, service_role;

create or replace function public.claim_bounty_award(p_bounty_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_award public.bounty_awards%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'sign_in_required');
  end if;
  update public.bounty_awards set claimed_at = now()
  where bounty_id = p_bounty_id and user_id = v_uid and claimed_at is null
  returning * into v_award;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'nothing_to_claim');
  end if;
  return jsonb_build_object('ok', true, 'mdollarz', v_award.mdollarz);
end;
$$;
revoke all on function public.claim_bounty_award(text) from public;
grant execute on function public.claim_bounty_award(text) to authenticated;

-- Make one pending bounty live for 7 days from now. Any running bounty ends now and is
-- judged (its prize goes to the best human entry), so only one bounty is ever live.
create or replace function public.activate_bounty(p_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.bounties where id = p_id and status = 'pending') then
    return false;
  end if;
  update public.bounties set ends_at = greatest(starts_at + interval '1 second', now())
  where status = 'active' and id <> p_id;
  perform public.close_due_bounties();
  update public.bounties
  set status = 'active', starts_at = now(), ends_at = now() + interval '7 days'
  where id = p_id and status = 'pending';
  return true;
end;
$$;
revoke all on function public.activate_bounty(text) from public;
grant execute on function public.activate_bounty(text) to service_role;

-- ---------------------------------------------------------------- review queue
create or replace function public.admin_house_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  return jsonb_build_object(
    'ok', true,
    'memes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'title', m.title, 'category', m.category, 'image_url', m.image_url,
        'overlay', m.overlay, 'author_name', m.author_name, 'created_at', m.created_at,
        'topic', m.moderation -> 'house' ->> 'topic', 'media_type', m.media_type
      ) order by m.created_at)
      from public.memes m
      where m.status = 'pending' and public.is_house_user(m.user_id)
    ), '[]'::jsonb),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'battle_id', e.battle_id, 'battle_title', b.title, 'image_url', b.image_url,
        'top_text', e.top_text, 'bottom_text', e.bottom_text, 'created_at', e.created_at,
        'style', e.moderation -> 'house' ->> 'style', 'ends_at', b.ends_at
      ) order by e.created_at)
      from public.caption_battle_entries e
      left join public.battles b on b.id = e.battle_id
      where e.status = 'pending' and e.is_house
    ), '[]'::jsonb),
    'bounties', coalesce((
      select jsonb_agg(to_jsonb(x) - 'moderation' order by x.created_at)
      from public.bounties x where x.status = 'pending'
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.admin_house_queue() from public;
grant execute on function public.admin_house_queue() to authenticated;

-- Approve uses the normal moderator path (mod_apply_decision_v2 → moderation_actions).
-- Reject marks the item 'rejected' and logs it, WITHOUT a strike (it is our own bot).
create or replace function public.admin_house_decide(p_kind text, p_id text, p_approve boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_res jsonb;
  v_n integer;
begin
  if not public.is_moderator() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_kind = 'meme' then
    if not exists (select 1 from public.memes where id = p_id::uuid and public.is_house_user(user_id)) then
      return jsonb_build_object('ok', false, 'error', 'not_house');
    end if;
    if p_approve then
      return public.mod_apply_decision_v2(v_uid, p_id::uuid, null, null, null, 'approve', 'house queue');
    end if;
    update public.memes set status = 'rejected', removed_reason = 'house_queue' where id = p_id::uuid;
    insert into public.moderation_actions (moderator_id, action, meme_id, note)
    values (v_uid, 'house_reject', p_id::uuid, 'house queue');
  elsif p_kind = 'entry' then
    if not exists (select 1 from public.caption_battle_entries where id = p_id::uuid and is_house) then
      return jsonb_build_object('ok', false, 'error', 'not_house');
    end if;
    if p_approve then
      return public.mod_apply_decision_v2(v_uid, null, null, p_id::uuid, null, 'approve', 'house queue');
    end if;
    update public.caption_battle_entries set status = 'rejected', updated_at = now() where id = p_id::uuid;
    insert into public.moderation_actions (moderator_id, action, battle_entry_id, note)
    values (v_uid, 'house_reject', p_id::uuid, 'house queue');
  elsif p_kind = 'bounty' then
    if p_approve then
      if not public.activate_bounty(p_id) then
        return jsonb_build_object('ok', false, 'error', 'not_found');
      end if;
    else
      update public.bounties set status = 'rejected', closed_at = now() where id = p_id and status = 'pending';
      get diagnostics v_n = row_count;
      if v_n = 0 then
        return jsonb_build_object('ok', false, 'error', 'not_found');
      end if;
    end if;
    insert into public.moderation_actions (moderator_id, action, note)
    values (v_uid, case when p_approve then 'house_approve' else 'house_reject' end, 'bounty ' || p_id);
  else
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.admin_house_decide(text, text, boolean) from public;
grant execute on function public.admin_house_decide(text, text, boolean) to authenticated;

-- ---------------------------------------------------------------- digest: + house section
create or replace function public.moderation_digest_send()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_counts jsonb;
  v_house jsonb;
  v_url text;
  v_text text;
  v_sent boolean := false;
  v_y_start timestamptz := (date_trunc('day', now() at time zone 'Europe/London') - interval '1 day') at time zone 'Europe/London';
  v_y_end timestamptz := date_trunc('day', now() at time zone 'Europe/London') at time zone 'Europe/London';
begin
  select jsonb_build_object(
    'uploads_24h', (select count(*) from public.memes where created_at > now() - interval '24 hours'),
    'approved_24h', (select count(*) from public.memes where created_at > now() - interval '24 hours' and status = 'approved'),
    'held_pending_now', (select count(*) from public.memes where status = 'pending'),
    'auto_rejections_24h', (select count(*) from public.upload_rejections where created_at > now() - interval '24 hours'),
    'reports_24h', (select count(*) from public.reports where created_at > now() - interval '24 hours'),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'auto_hidden_24h', (select count(*) from public.moderation_actions where action = 'auto_hide' and created_at > now() - interval '24 hours'),
    'moderator_actions_24h', (select count(*) from public.moderation_actions where moderator_id is not null and created_at > now() - interval '24 hours'),
    'open_incidents', (select count(*) from public.moderation_incidents where status = 'open')
  ) into v_counts;

  select jsonb_build_object(
    'enabled', (select enabled from public.agent_settings where id),
    'review_mode', (select review_mode from public.agent_settings where id),
    'pending_memes', (select count(*) from public.memes where status = 'pending' and public.is_house_user(user_id)),
    'pending_entries', (select count(*) from public.caption_battle_entries where status = 'pending' and is_house),
    'pending_bounties', (select count(*) from public.bounties where status = 'pending'),
    'runs_yesterday', (select count(*) from public.agent_runs where started_at >= v_y_start and started_at < v_y_end),
    'runs_ok', (select count(*) from public.agent_runs where started_at >= v_y_start and started_at < v_y_end and status = 'ok'),
    'runs_skipped', (select count(*) from public.agent_runs where started_at >= v_y_start and started_at < v_y_end and status = 'skipped'),
    'runs_error', (select count(*) from public.agent_runs where started_at >= v_y_start and started_at < v_y_end and status = 'error'),
    'items_yesterday', (select coalesce(sum(items_created), 0) from public.agent_runs where started_at >= v_y_start and started_at < v_y_end),
    'tokens_yesterday', (select coalesce(sum(tokens_used), 0) from public.agent_runs where started_at >= v_y_start and started_at < v_y_end)
  ) into v_house;
  v_counts := v_counts || jsonb_build_object('house', v_house);

  v_text := format(
    E'**THE MEMES.net — daily moderation digest**\nUploads (24 h): %s (approved %s)\nAuto-rejected uploads (24 h): %s\nHeld for review now: %s\nReports (24 h): %s · open: %s\nAuto-hidden (24 h): %s\nModerator actions (24 h): %s%s\nQueue: https://thememes.net/admin/moderation',
    v_counts ->> 'uploads_24h', v_counts ->> 'approved_24h', v_counts ->> 'auto_rejections_24h',
    v_counts ->> 'held_pending_now', v_counts ->> 'reports_24h', v_counts ->> 'open_reports',
    v_counts ->> 'auto_hidden_24h', v_counts ->> 'moderator_actions_24h',
    case when (v_counts ->> 'open_incidents')::int > 0
         then E'\n⚠️ Open child-safety incidents: ' || (v_counts ->> 'open_incidents') || ' (follow the legal reporting procedure)'
         else '' end
  );
  v_text := v_text || format(
    E'\n\n**🤖 House agents** (%s, review mode %s)\nWaiting in the House queue: %s memes · %s battle entries · %s bounties\nYesterday: %s runs (%s ok, %s skipped, %s errors) · %s items · %s tokens\nHouse queue: https://thememes.net/admin/house',
    case when (v_house ->> 'enabled')::boolean then 'ON' else 'OFF' end,
    case when (v_house ->> 'review_mode')::boolean then 'ON' else 'OFF' end,
    v_house ->> 'pending_memes', v_house ->> 'pending_entries', v_house ->> 'pending_bounties',
    v_house ->> 'runs_yesterday', v_house ->> 'runs_ok', v_house ->> 'runs_skipped', v_house ->> 'runs_error',
    v_house ->> 'items_yesterday', v_house ->> 'tokens_yesterday'
  );

  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'moderation_digest_webhook_url' limit 1;
  exception when others then
    v_url := null;
  end;

  if v_url is not null and v_url like 'https://%' then
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('content', v_text),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
    v_sent := true;
  end if;

  insert into public.moderation_digests (counts, sent) values (v_counts, v_sent);
  return v_counts || jsonb_build_object('sent', v_sent);
end;
$$;
revoke all on function public.moderation_digest_send() from public, anon, authenticated;
grant execute on function public.moderation_digest_send() to service_role;

-- ---------------------------------------------------------------- battle state: + is_house, human_entry_count
create or replace function public.get_battle_state(p_battle_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_b public.battles%rowtype;
  v_prev public.battles%rowtype;
  v_threshold integer;
  v_my_votes jsonb := '[]'::jsonb;
  v_my_skips jsonb := '[]'::jsonb;
  v_vote_count integer := 0;
  v_others integer := 0;
  v_show_totals boolean;
  v_entries jsonb;
  v_my_entry jsonb;
  v_prev_top jsonb;
  v_my_award jsonb;
  v_entry_count integer;
  v_human_count integer := 0;
begin
  perform public.battle_tick();

  if p_battle_id is not null then
    select * into v_b from public.battles where id = p_battle_id and status in ('live', 'judging', 'complete');
  else
    select * into v_b from public.battles where status = 'live' order by starts_at desc limit 1;
  end if;

  select s.votes_before_totals into v_threshold from public.battle_settings s where s.id;

  if v_b.id is not null then
    select count(*) into v_entry_count
    from public.caption_battle_entries where battle_id = v_b.id and status = 'approved';
    select count(*) into v_human_count
    from public.caption_battle_entries where battle_id = v_b.id and status = 'approved' and not is_house;

    if v_uid is not null then
      -- "Funny" = direction 1 (scores a point); "Skip" = direction 0 (seen, no point).
      -- Both count towards the votes needed before live totals are shown.
      select coalesce(jsonb_agg(v.entry_id) filter (where v.direction = 1), '[]'::jsonb), count(*)
      into v_my_votes, v_vote_count
      from public.caption_battle_votes v
      join public.caption_battle_entries e on e.id = v.entry_id
      where v.user_id = v_uid and e.battle_id = v_b.id;

      select coalesce(jsonb_agg(v.entry_id) filter (where v.direction = 0), '[]'::jsonb)
      into v_my_skips
      from public.caption_battle_votes v
      join public.caption_battle_entries e on e.id = v.entry_id
      where v.user_id = v_uid and e.battle_id = v_b.id;

      select to_jsonb(x) into v_my_entry from (
        select e.id, e.top_text, e.bottom_text, e.status, e.created_at, e.updated_at, e.rank,
               case when v_b.status = 'complete' then e.score end as score
        from public.caption_battle_entries e
        where e.battle_id = v_b.id and e.user_id = v_uid
      ) x;
    end if;

    select count(*) into v_others
    from public.caption_battle_entries
    where battle_id = v_b.id and status = 'approved' and (v_uid is null or user_id <> v_uid);

    v_show_totals := v_b.status = 'complete' or v_vote_count >= least(v_threshold, v_others);

    select coalesce(jsonb_agg(to_jsonb(q) order by q.sort_score desc, q.created_at), '[]'::jsonb)
    into v_entries
    from (
      select e.id, e.author_name, e.top_text, e.bottom_text, e.status, e.created_at, e.rank,
             e.is_house,
             (v_uid is not null and e.user_id = v_uid) as is_mine,
             case when v_show_totals then e.score end as score,
             case when v_show_totals then e.score else 0 end as sort_score
      from public.caption_battle_entries e
      where e.battle_id = v_b.id
        and (e.status = 'approved' or (v_uid is not null and e.user_id = v_uid and e.status = 'pending'))
      order by e.score desc, e.created_at
      limit 200
    ) q;
  end if;

  -- Yesterday's (most recent finished) battle: top 3 and my award.
  select * into v_prev from public.battles
  where status = 'complete' and (v_b.id is null or id <> v_b.id)
  order by ends_at desc limit 1;

  if v_prev.id is not null then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.rank), '[]'::jsonb) into v_prev_top
    from (
      select e.id, e.rank, e.author_name, e.top_text, e.bottom_text, e.score
      from public.caption_battle_entries e
      where e.battle_id = v_prev.id and e.status = 'approved' and e.rank between 1 and 3
    ) t;
    if v_uid is not null then
      select to_jsonb(a) into v_my_award from (
        select battle_id, rank, badge, mdollarz, claimed_at from public.battle_awards
        where battle_id = v_prev.id and user_id = v_uid
      ) a;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'battle', case when v_b.id is null then null else jsonb_build_object(
      'id', v_b.id, 'battle_day', v_b.battle_day, 'image_url', v_b.image_url,
      'template_id', v_b.template_id, 'title', v_b.title, 'prompt', v_b.prompt, 'theme', v_b.theme,
      'starts_at', v_b.starts_at, 'ends_at', v_b.ends_at, 'status', v_b.status, 'sponsor', v_b.sponsor
    ) end,
    'entry_count', coalesce(v_entry_count, 0),
    'human_entry_count', coalesce(v_human_count, 0),
    'entries', coalesce(v_entries, '[]'::jsonb),
    'show_totals', coalesce(v_show_totals, false),
    'votes_needed', greatest(0, least(coalesce(v_threshold, 3), v_others) - v_vote_count),
    'my_votes', v_my_votes,
    'my_skips', v_my_skips,
    'my_entry', v_my_entry,
    'previous', case when v_prev.id is null then null else jsonb_build_object(
      'id', v_prev.id, 'battle_day', v_prev.battle_day, 'image_url', v_prev.image_url,
      'title', v_prev.title, 'theme', v_prev.theme, 'ends_at', v_prev.ends_at,
      'top', coalesce(v_prev_top, '[]'::jsonb), 'my_award', v_my_award
    ) end,
    'settings', (select jsonb_build_object('caption_max', s.caption_max, 'votes_before_totals', s.votes_before_totals)
                 from public.battle_settings s where s.id)
  );
end;
$$;
revoke all on function public.get_battle_state(uuid) from public;
grant execute on function public.get_battle_state(uuid) to anon, authenticated, service_role;
-- ---------------------------------------------------------------- creator profile: + is_house
create or replace function public.get_creator_profile(p_handle text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_raw text := regexp_replace(trim(coalesce(p_handle, '')), '^@+', '');
  v_handle text := lower(v_raw);
  v_profile record;
  v_follower_count integer := 0;
  v_is_following boolean := false;
  v_is_caption_king boolean := false;
  v_caption_wins integer := 0;
  v_memes_count integer := 0;
  v_total_score integer := 0;
  v_total_remixes integer := 0;
  v_wholesome_memes integer := 0;
  v_battle_entries integer := 0;
  v_podium_finishes integer := 0;
  v_battle_awards jsonb := '[]'::jsonb;
  v_memes jsonb := '[]'::jsonb;
  v_scores jsonb := '[]'::jsonb;
  v_display_handle text := v_raw;
begin
  if v_handle !~ '^[a-z0-9_-]{2,32}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_handle');
  end if;

  select id, username, avatar_id, created_at, bio, xp, streak_days, best_streak, is_house
  into v_profile
  from public.profiles
  where lower(username) = v_handle
  limit 1;

  if v_profile.username is not null then
    v_display_handle := v_profile.username;
  end if;

  select count(*)::integer into v_follower_count
  from public.follows
  where followed_handle = v_handle;

  if v_uid is not null then
    select exists(
      select 1 from public.follows
      where follower_id = v_uid and followed_handle = v_handle
    ) into v_is_following;
  end if;

  select
    count(*)::integer,
    coalesce(bool_or(crowned_until > now()), false)
  into v_caption_wins, v_is_caption_king
  from public.caption_battle_winners
  where lower(author_name) = v_handle;

  select
    count(*)::integer,
    coalesce(sum(score), 0)::integer,
    coalesce(sum(mutation_count), 0)::integer,
    count(*) filter (where lower(coalesce(category, '')) = 'wholesome')::integer
  into v_memes_count, v_total_score, v_total_remixes, v_wholesome_memes
  from public.memes
  where status = 'approved'
    and (
      lower(author_name) = v_handle
      or (v_profile.id is not null and user_id = v_profile.id)
    );

  select count(*)::integer
  into v_battle_entries
  from public.caption_battle_entries
  where coalesce(status, 'approved') <> 'removed'
    and (
      lower(author_name) = v_handle
      or (v_profile.id is not null and user_id = v_profile.id)
    );

  if v_profile.id is not null then
    select
      count(*) filter (where a.rank <= 3)::integer,
      coalesce(
        (
          select jsonb_agg(row_to_json(aw))
          from (
            select a2.battle_id, b.battle_day, b.title, a2.rank, a2.badge, a2.created_at
            from public.battle_awards a2
            left join public.battles b on b.id = a2.battle_id
            where a2.user_id = v_profile.id
            order by a2.created_at desc
            limit 10
          ) aw
        ),
        '[]'::jsonb
      )
    into v_podium_finishes, v_battle_awards
    from public.battle_awards a
    where a.user_id = v_profile.id;
  end if;

  select coalesce(jsonb_agg(row_to_json(m_row)), '[]'::jsonb)
  into v_memes
  from (
    select
      id,
      title,
      category,
      image_url,
      author_name,
      score,
      hot_score,
      comments_count,
      reactions,
      media_type,
      is_bounty,
      bounty_id,
      is_house,
      mutation_count,
      parent_meme_id,
      root_meme_id,
      generation,
      created_at
    from public.memes_feed_view
    where lower(author_name) = v_handle
      and status = 'approved' -- this function is SECURITY DEFINER: never list pending/removed memes
    order by score desc, created_at desc, id desc
    limit 48
  ) m_row;

  if v_profile.id is not null then
    select coalesce(jsonb_agg(row_to_json(s_row)), '[]'::jsonb)
    into v_scores
    from (
      select distinct on (s.game)
        s.game,
        s.score as high_score,
        s.initials,
        s.created_at as achieved_at
      from public.scores s
      where s.user_id = v_profile.id
      order by s.game, s.score desc, s.created_at desc
    ) s_row;
  end if;

  return jsonb_build_object(
    'ok', true,
    'handle', v_display_handle,
    'normalized_handle', v_handle,
    'found', (v_profile.id is not null or v_memes_count > 0 or v_caption_wins > 0),
    'verified', (v_profile.id is not null),
    'is_house', coalesce(v_profile.is_house, false),
    'avatar_id', coalesce(v_profile.avatar_id, 'pixel-alien'),
    'bio', coalesce(v_profile.bio, ''),
    'xp', coalesce(v_profile.xp, 0),
    'streak_days', coalesce(v_profile.streak_days, 0),
    'best_streak', coalesce(v_profile.best_streak, 0),
    'joined_at', v_profile.created_at,
    'follower_count', v_follower_count,
    'is_following', v_is_following,
    'is_caption_king', v_is_caption_king,
    'caption_wins', greatest(v_caption_wins, coalesce((select count(*)::integer from public.battle_awards a where v_profile.id is not null and a.user_id = v_profile.id and a.rank = 1), 0)),
    'battle_entries', v_battle_entries,
    'podium_finishes', greatest(v_podium_finishes, v_caption_wins),
    'battle_awards', v_battle_awards,
    'stats', jsonb_build_object(
      'memes_count', v_memes_count,
      'total_score', v_total_score,
      'total_remixes', v_total_remixes,
      'wholesome_memes', v_wholesome_memes
    ),
    'memes', v_memes,
    'high_scores', v_scores
  );
end;
$$;
