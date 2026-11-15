-- ============================================================================
-- Migration 20261115000013 — Phase 33 task 33.14
-- Real global arcade leaderboards with 3-letter initials, Today / This Week /
-- All-time boards, and server-issued session tokens with per-game sanity limits.
--
--   1. public.score_sessions: server-only table issuing short-lived start tokens
--      when a player opens a cabinet, preventing zero-second replay spam.
--   2. public.scores (game, user_id, score, initials, period, created_at): public
--      read-only via RLS; written only via submit_arcade_score().
--   3. check_initials_allowed(p_initials): enforces 3 uppercase A-Z0-9 chars and
--      rejects slurs/profanity from a server blocklist.
--   4. start_game_session(p_game), submit_arcade_score(...), get_game_leaderboard(...).
-- ============================================================================

create table if not exists public.score_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  game text not null,
  issued_at timestamptz not null default now(),
  consumed_at timestamptz,
  submitted_score integer
);

create index if not exists score_sessions_user_idx
  on public.score_sessions (user_id, issued_at desc);

alter table public.score_sessions enable row level security;
revoke all on table public.score_sessions from public, anon, authenticated;

create table if not exists public.scores (
  id uuid default gen_random_uuid() primary key,
  game text not null check (
    game in (
      'pinball', 'crush', 'stocks', 'pusher',
      'blackjack', 'roulette', 'slots', 'poker',
      'bingo', 'derby', 'hilow'
    )
  ),
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score >= 1 and score <= 10000000),
  initials text not null check (initials ~ '^[A-Z0-9]{3}$'),
  period text not null default 'all_time' check (period in ('today', 'week', 'all_time')),
  created_at timestamptz not null default now()
);

create index if not exists scores_game_score_created_idx
  on public.scores (game, score desc, created_at asc);

create index if not exists scores_game_created_idx
  on public.scores (game, created_at desc);

create index if not exists scores_user_idx
  on public.scores (user_id, created_at desc);

alter table public.scores enable row level security;
revoke insert, update, delete on table public.scores from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'scores' and policyname = 'Arcade scores are publicly readable'
  ) then
    create policy "Arcade scores are publicly readable"
      on public.scores for select
      using (true);
  end if;
end
$$;

create or replace function public.check_initials_allowed(p_initials text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    p_initials ~ '^[A-Z0-9]{3}$'
    and upper(p_initials) not in (
      'ASS', 'AZN', 'COK', 'CUM', 'DIK', 'DIC', 'FAG', 'FCK', 'FKU', 'FUC',
      'FUK', 'GAY', 'HOE', 'JAP', 'JEW', 'KKK', 'KNT', 'KYS', 'NIG', 'NGR',
      'PEE', 'PIS', 'POO', 'PRK', 'PUS', 'SEX', 'SHT', 'SLM', 'SPK', 'STD',
      'TIT', 'TWAT', 'VAG', 'WOP', 'WTF', 'XXX', 'CNT', 'BCH', 'SUK', 'COON'
    );
$$;

revoke all on function public.check_initials_allowed(text) from public;
grant execute on function public.check_initials_allowed(text) to anon, authenticated, service_role;

create or replace function public.arcade_game_limits(p_game text)
returns table (base_score integer, per_sec integer, hard_max integer)
language sql
immutable
set search_path = ''
as $$
  select l.base_score, l.per_sec, l.hard_max
  from (
    values
      ('pinball',   15000, 3000, 1000000),
      ('crush',      8000, 1800,  500000),
      ('pusher',     6000, 1500,  500000),
      ('stocks',     2000,  400,  250000),
      ('slots',      6000, 1200,  250000),
      ('blackjack',  5000, 1000,  250000),
      ('roulette',   8000, 1500,  250000),
      ('poker',      6000, 1200,  250000),
      ('bingo',      3000,  600,  100000),
      ('derby',      4000,  900,  150000),
      ('hilow',       100,   12,    5000)
  ) as l(game, base_score, per_sec, hard_max)
  where l.game = p_game;
$$;

revoke all on function public.arcade_game_limits(text) from public;
grant execute on function public.arcade_game_limits(text) to service_role;

create or replace function public.start_game_session(p_game text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_clean_game text := lower(btrim(coalesce(p_game, '')));
  v_lim record;
  v_session_id uuid;
  v_issued timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'sign_in_required');
  end if;

  insert into public.profiles (id)
  values (v_uid)
  on conflict (id) do nothing;

  if public.is_suspended(v_uid) then
    return jsonb_build_object('ok', false, 'error', 'suspended');
  end if;

  select * into v_lim from public.arcade_game_limits(v_clean_game);
  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_game');
  end if;

  insert into public.score_sessions (user_id, game)
  values (v_uid, v_clean_game)
  returning id, issued_at into v_session_id, v_issued;

  return jsonb_build_object(
    'ok', true,
    'session_id', v_session_id,
    'game', v_clean_game,
    'issued_at', v_issued,
    'base_score', v_lim.base_score,
    'per_sec', v_lim.per_sec,
    'hard_max', v_lim.hard_max
  );
end;
$$;

revoke all on function public.start_game_session(text) from public;
grant execute on function public.start_game_session(text) to authenticated, service_role;

create or replace function public.submit_arcade_score(
  p_session_id uuid,
  p_game text,
  p_score integer,
  p_initials text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_game text := lower(btrim(coalesce(p_game, '')));
  v_initials text := upper(btrim(coalesce(p_initials, '')));
  v_lim record;
  v_sess record;
  v_elapsed numeric;
  v_max_allowed integer;
  v_score_id uuid;
  v_rank_all integer;
  v_rank_today integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'sign_in_required');
  end if;

  if public.is_suspended(v_uid) then
    return jsonb_build_object('ok', false, 'error', 'suspended');
  end if;

  if not public.check_initials_allowed(v_initials) then
    return jsonb_build_object('ok', false, 'error', 'blocked_initials');
  end if;

  if p_score is null or p_score < 1 then
    return jsonb_build_object('ok', false, 'error', 'invalid_score');
  end if;

  select * into v_lim from public.arcade_game_limits(v_game);
  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_game');
  end if;

  if p_session_id is null then
    return jsonb_build_object('ok', false, 'error', 'session_required');
  end if;

  select * into v_sess
  from public.score_sessions
  where id = p_session_id
    and user_id = v_uid
    and game = v_game
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_session');
  end if;

  if v_sess.consumed_at is not null then
    return jsonb_build_object('ok', false, 'error', 'session_already_used');
  end if;

  v_elapsed := greatest(1.0, extract(epoch from (now() - v_sess.issued_at)));
  v_max_allowed := least(
    v_lim.hard_max,
    v_lim.base_score + floor(v_elapsed * v_lim.per_sec)::integer
  );

  if p_score > v_max_allowed then
    update public.score_sessions
    set consumed_at = now(), submitted_score = p_score
    where id = v_sess.id;
    return jsonb_build_object(
      'ok', false,
      'error', 'score_implausible',
      'max_allowed', v_max_allowed
    );
  end if;

  update public.score_sessions
  set consumed_at = now(), submitted_score = p_score
  where id = v_sess.id;

  insert into public.scores (game, user_id, score, initials, period)
  values (v_game, v_uid, p_score, v_initials, 'all_time')
  returning id into v_score_id;

  select (count(*)::integer + 1)
  into v_rank_all
  from public.scores s
  where s.game = v_game
    and (s.score > p_score or (s.score = p_score and s.id <> v_score_id and s.created_at < now()));

  select (count(*)::integer + 1)
  into v_rank_today
  from public.scores s
  where s.game = v_game
    and s.created_at >= date_trunc('day', timezone('utc', now()))
    and (s.score > p_score or (s.score = p_score and s.id <> v_score_id and s.created_at < now()));

  return jsonb_build_object(
    'ok', true,
    'id', v_score_id,
    'game', v_game,
    'score', p_score,
    'initials', v_initials,
    'rank_all_time', v_rank_all,
    'rank_today', v_rank_today
  );
end;
$$;

revoke all on function public.submit_arcade_score(uuid, text, integer, text) from public;
grant execute on function public.submit_arcade_score(uuid, text, integer, text) to authenticated, service_role;

create or replace function public.get_game_leaderboard(
  p_game text,
  p_period text default 'all_time',
  p_limit integer default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_game text := lower(btrim(coalesce(p_game, '')));
  v_period text := lower(btrim(coalesce(p_period, 'all_time')));
  v_lim integer := greatest(1, least(coalesce(p_limit, 10), 50));
  v_since timestamptz := '-infinity'::timestamptz;
  v_rows jsonb;
begin
  if v_period = 'today' then
    v_since := date_trunc('day', timezone('utc', now()));
  elsif v_period = 'week' then
    v_since := date_trunc('week', timezone('utc', now()));
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'game', q.game,
        'score', q.score,
        'initials', q.initials,
        'created_at', q.created_at
      )
      order by q.score desc, q.created_at asc
    ),
    '[]'::jsonb
  )
  into v_rows
  from (
    select s.id, s.game, s.score, s.initials, s.created_at
    from public.scores s
    where s.game = v_game
      and s.created_at >= v_since
    order by s.score desc, s.created_at asc
    limit v_lim
  ) q;

  return jsonb_build_object(
    'ok', true,
    'game', v_game,
    'period', v_period,
    'entries', v_rows
  );
end;
$$;

revoke all on function public.get_game_leaderboard(text, text, integer) from public;
grant execute on function public.get_game_leaderboard(text, text, integer) to anon, authenticated, service_role;
