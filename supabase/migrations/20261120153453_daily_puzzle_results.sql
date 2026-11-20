-- Phase 2.3: Per-user Guess the Meme daily puzzle results & guest merge RPCs

create table if not exists public.daily_puzzle_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  puzzle_date date not null,
  puzzle_number integer not null check (puzzle_number >= 1),
  solved smallint not null check (solved >= 0 and solved <= 10),
  total smallint not null check (total >= 1 and total <= 10),
  score integer not null default 0 check (score >= 0 and score <= 10000),
  grid text not null default '' check (char_length(grid) <= 32),
  results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, puzzle_date)
);

create index if not exists idx_daily_puzzle_results_date_score
  on public.daily_puzzle_results (puzzle_date, score desc);

alter table public.daily_puzzle_results enable row level security;
revoke insert, update, delete on table public.daily_puzzle_results from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_puzzle_results'
      and policyname = 'daily_puzzle_results_select_own'
  ) then
    create policy "daily_puzzle_results_select_own"
      on public.daily_puzzle_results for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end
$$;

create or replace function public._daily_puzzle_streak_for_user(
  p_user_id uuid,
  p_today date default current_date
)
returns table (current_streak integer, best_streak integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_prev_win_date date := null;
  v_run integer := 0;
  v_best integer := 0;
  v_cur integer := 0;
begin
  for v_row in
    select puzzle_date, solved
    from public.daily_puzzle_results
    where user_id = p_user_id
    order by puzzle_date asc
  loop
    if v_row.solved >= 3 then
      if v_prev_win_date is not null and v_prev_win_date = v_row.puzzle_date - 1 then
        v_run := v_run + 1;
      else
        v_run := 1;
      end if;
      v_prev_win_date := v_row.puzzle_date;
      if v_run > v_best then
        v_best := v_run;
      end if;
    else
      v_run := 0;
      v_prev_win_date := null;
    end if;
  end loop;

  if v_prev_win_date is not null and v_prev_win_date >= (p_today - 1) then
    v_cur := v_run;
  else
    v_cur := 0;
  end if;

  return query select v_cur, v_best;
end;
$$;
revoke all on function public._daily_puzzle_streak_for_user(uuid, date) from public, anon, authenticated;

create or replace function public.save_daily_puzzle_result(
  p_puzzle_date date,
  p_puzzle_number integer,
  p_solved smallint,
  p_total smallint,
  p_score integer,
  p_grid text,
  p_results jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_cur integer := 0;
  v_best integer := 0;
  v_today_row jsonb := null;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'sign_in_required');
  end if;
  if exists (select 1 from public.profiles where id = v_uid and suspended_until > now()) then
    return jsonb_build_object('ok', false, 'error', 'suspended');
  end if;
  if p_puzzle_date is null or p_puzzle_date < date '2026-01-01' or p_puzzle_date > (current_date + 1) then
    return jsonb_build_object('ok', false, 'error', 'invalid_date');
  end if;
  if p_total is null or p_total < 1 or p_total > 10 or p_solved is null or p_solved < 0 or p_solved > p_total then
    return jsonb_build_object('ok', false, 'error', 'invalid_counts');
  end if;
  if p_score is null or p_score < 0 or p_score > 10000 then
    return jsonb_build_object('ok', false, 'error', 'invalid_score');
  end if;

  insert into public.daily_puzzle_results (
    user_id, puzzle_date, puzzle_number, solved, total, score, grid, results
  ) values (
    v_uid,
    p_puzzle_date,
    greatest(1, coalesce(p_puzzle_number, 1)),
    p_solved,
    p_total,
    p_score,
    left(coalesce(p_grid, ''), 32),
    case when jsonb_typeof(p_results) = 'array' then p_results else '[]'::jsonb end
  )
  on conflict (user_id, puzzle_date) do nothing;

  select s.current_streak, s.best_streak
  into v_cur, v_best
  from public._daily_puzzle_streak_for_user(v_uid, least(p_puzzle_date, current_date + 1)) s;

  select jsonb_build_object(
    'puzzle_date', r.puzzle_date,
    'puzzle_number', r.puzzle_number,
    'solved', r.solved,
    'total', r.total,
    'score', r.score,
    'grid', r.grid,
    'results', r.results
  )
  into v_today_row
  from public.daily_puzzle_results r
  where r.user_id = v_uid and r.puzzle_date = p_puzzle_date;

  return jsonb_build_object(
    'ok', true,
    'streak', v_cur,
    'best_streak', v_best,
    'played_today', v_today_row is not null,
    'today_result', v_today_row
  );
end;
$$;
revoke all on function public.save_daily_puzzle_result(date, integer, smallint, smallint, integer, text, jsonb) from public, anon;
grant execute on function public.save_daily_puzzle_result(date, integer, smallint, smallint, integer, text, jsonb) to authenticated;

create or replace function public.get_my_daily_puzzle_state(
  p_today date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := least(greatest(coalesce(p_today, current_date), current_date - 1), current_date + 1);
  v_cur integer := 0;
  v_best integer := 0;
  v_today_row jsonb := null;
  v_recent jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'sign_in_required');
  end if;

  select s.current_streak, s.best_streak
  into v_cur, v_best
  from public._daily_puzzle_streak_for_user(v_uid, v_today) s;

  select jsonb_build_object(
    'puzzle_date', r.puzzle_date,
    'puzzle_number', r.puzzle_number,
    'solved', r.solved,
    'total', r.total,
    'score', r.score,
    'grid', r.grid,
    'results', r.results
  )
  into v_today_row
  from public.daily_puzzle_results r
  where r.user_id = v_uid and r.puzzle_date = v_today;

  select coalesce(jsonb_agg(r.puzzle_date order by r.puzzle_date desc), '[]'::jsonb)
  into v_recent
  from (
    select puzzle_date
    from public.daily_puzzle_results
    where user_id = v_uid
    order by puzzle_date desc
    limit 30
  ) r;

  return jsonb_build_object(
    'ok', true,
    'today_result', v_today_row,
    'streak', v_cur,
    'best_streak', v_best,
    'recent_dates', v_recent
  );
end;
$$;
revoke all on function public.get_my_daily_puzzle_state(date) from public, anon;
grant execute on function public.get_my_daily_puzzle_state(date) to authenticated;
