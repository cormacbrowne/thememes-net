-- Phase 2.4: Daily activity streaks with weekly freeze, XP & weekly Europe/London leaderboards

alter table public.profiles
  add column if not exists xp integer not null default 0 check (xp >= 0),
  add column if not exists streak_days integer not null default 0 check (streak_days >= 0),
  add column if not exists best_streak integer not null default 0 check (best_streak >= 0),
  add column if not exists last_active_day date,
  add column if not exists freeze_used_week text;

create table if not exists public.daily_activity_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_day date not null,
  action text not null check (action in ('meme_created', 'battle_entry', 'battle_vote', 'daily_puzzle')),
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, activity_day, action)
);

alter table public.daily_activity_log enable row level security;
revoke insert, update, delete on table public.daily_activity_log from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_activity_log'
      and policyname = 'daily_activity_log_select_own'
  ) then
    create policy "daily_activity_log_select_own"
      on public.daily_activity_log for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end
$$;

create or replace function public.get_my_profile()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.profiles%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  insert into public.profiles (id)
  values (v_uid)
  on conflict (id) do nothing;

  select * into v_row
  from public.profiles
  where id = v_uid;

  return jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'username', v_row.username,
    'avatar_id', v_row.avatar_id,
    'role', v_row.role,
    'strikes', v_row.strikes,
    'suspended_until', v_row.suspended_until,
    'xp', coalesce(v_row.xp, 0),
    'streak_days', coalesce(v_row.streak_days, 0),
    'best_streak', coalesce(v_row.best_streak, 0),
    'last_active_day', v_row.last_active_day,
    'freeze_used_week', v_row.freeze_used_week
  );
end;
$$;

create or replace function public.record_daily_activity(p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_today date := timezone('Europe/London', now())::date;
  v_week text := to_char(v_today, 'IYYY-"W"IW');
  v_xp_gain integer := 0;
  v_inserted_xp integer := 0;
  v_prof public.profiles%rowtype;
  v_gap integer := 0;
  v_next_streak integer := 1;
  v_next_best integer := 1;
  v_freeze_used boolean := false;
  v_next_freeze_week text := null;
  v_next_last_day date := v_today;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'sign_in_required');
  end if;
  if v_action not in ('meme_created', 'battle_entry', 'battle_vote', 'daily_puzzle') then
    return jsonb_build_object('ok', false, 'error', 'invalid_action');
  end if;
  if exists (select 1 from public.profiles where id = v_uid and suspended_until > now()) then
    return jsonb_build_object('ok', false, 'error', 'suspended');
  end if;

  v_xp_gain := case v_action
    when 'meme_created' then 35
    when 'battle_entry' then 25
    when 'daily_puzzle' then 25
    when 'battle_vote' then 10
    else 10
  end;

  insert into public.profiles (id)
  values (v_uid)
  on conflict (id) do nothing;

  insert into public.daily_activity_log (user_id, activity_day, action, xp_awarded)
  values (v_uid, v_today, v_action, v_xp_gain)
  on conflict (user_id, activity_day, action) do nothing
  returning xp_awarded into v_inserted_xp;

  v_inserted_xp := coalesce(v_inserted_xp, 0);

  select * into v_prof
  from public.profiles
  where id = v_uid
  for update;

  v_next_freeze_week := v_prof.freeze_used_week;

  if v_prof.last_active_day is null then
    v_next_streak := 1;
    v_next_last_day := v_today;
  else
    v_gap := v_today - v_prof.last_active_day;
    if v_gap <= 0 then
      v_next_streak := greatest(1, coalesce(v_prof.streak_days, 1));
      v_next_last_day := v_prof.last_active_day;
    elsif v_gap = 1 then
      v_next_streak := coalesce(v_prof.streak_days, 0) + 1;
    elsif v_gap = 2 and v_prof.freeze_used_week is distinct from v_week and coalesce(v_prof.streak_days, 0) > 0 then
      v_next_streak := v_prof.streak_days + 1;
      v_next_freeze_week := v_week;
      v_freeze_used := true;
    else
      v_next_streak := 1;
    end if;
  end if;

  v_next_best := greatest(coalesce(v_prof.best_streak, 0), v_next_streak);

  update public.profiles
  set xp = coalesce(xp, 0) + v_inserted_xp,
      streak_days = v_next_streak,
      best_streak = v_next_best,
      last_active_day = v_next_last_day,
      freeze_used_week = v_next_freeze_week
  where id = v_uid
  returning * into v_prof;

  return jsonb_build_object(
    'ok', true,
    'xp_added', v_inserted_xp,
    'xp', coalesce(v_prof.xp, 0),
    'streak_days', coalesce(v_prof.streak_days, 1),
    'best_streak', coalesce(v_prof.best_streak, 1),
    'last_active_day', v_prof.last_active_day,
    'freeze_used_week', v_prof.freeze_used_week,
    'freeze_used', v_freeze_used,
    'freeze_available', (v_prof.freeze_used_week is distinct from v_week)
  );
end;
$$;
revoke all on function public.record_daily_activity(text) from public, anon;
grant execute on function public.record_daily_activity(text) to authenticated;

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
  -- 1. Top Creators (real upvotes received on approved memes this week)
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
    group by m.author_name
    order by upvotes desc, memes_count desc, m.author_name asc
    limit v_lim
  ) t;

  -- 2. Battle Points (this week's Caption Battle entries + podium bonus from battle_awards.rank)
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

  -- 3. Daily Puzzle (Guess the Meme scores this London week)
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
    group by coalesce(nullif(p.username, ''), 'Player_' || left(d.user_id::text, 6))
    order by points desc, solved desc, days_played desc
    limit v_lim
  ) t;

  -- 4. All-Time Hall of Fame (Caption Battle champions)
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
revoke all on function public.get_weekly_leaderboards(integer) from public;
grant execute on function public.get_weekly_leaderboards(integer) to anon, authenticated, service_role;
