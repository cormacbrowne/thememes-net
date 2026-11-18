-- ============================================================================
-- Migration 20261117000003 — 1–5 Star Arcade Game Ratings
--   * Stores per-user 1..5 star ratings for arcade games
--   * RLS enabled; direct writes revoked; writes via rate_game() RPC only
--   * Public aggregate read via get_game_ratings() RPC
-- ============================================================================

create table if not exists public.game_ratings (
  game_id text not null check (
    game_id in (
      'bingo', 'pusher', 'roulette', 'blackjack', 'poker', 'slots', 'eightball', 'derby',
      'invaders', 'serpent', 'blaster', 'sunset', 'void', 'riders', 'pinball', 'crush',
      'guess', 'hilow', 'swipe', 'battle', 'stocks'
    )
  ),
  user_id uuid not null references auth.users(id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

create index if not exists game_ratings_game_idx
  on public.game_ratings (game_id, stars);

alter table public.game_ratings enable row level security;

revoke all on table public.game_ratings from public, anon, authenticated;

drop policy if exists "Own game rating readable" on public.game_ratings;
create policy "Own game rating readable"
  on public.game_ratings for select
  to authenticated
  using (user_id = auth.uid());

grant select on table public.game_ratings to authenticated;

create or replace function public.rate_game(p_game_id text, p_stars integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_avg numeric;
  v_count bigint;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_stars is null or p_stars < 1 or p_stars > 5 then
    raise exception 'stars must be between 1 and 5' using errcode = '22023';
  end if;

  if p_game_id is null or p_game_id not in (
    'bingo', 'pusher', 'roulette', 'blackjack', 'poker', 'slots', 'eightball', 'derby',
    'invaders', 'serpent', 'blaster', 'sunset', 'void', 'riders', 'pinball', 'crush',
    'guess', 'hilow', 'swipe', 'battle', 'stocks'
  ) then
    raise exception 'unknown game id' using errcode = '22023';
  end if;

  insert into public.game_ratings (game_id, user_id, stars, updated_at)
  values (p_game_id, v_uid, p_stars::smallint, now())
  on conflict (game_id, user_id) do update
    set stars = excluded.stars,
        updated_at = now();

  select round(avg(stars)::numeric, 2), count(*)
  into v_avg, v_count
  from public.game_ratings
  where game_id = p_game_id;

  return jsonb_build_object(
    'ok', true,
    'game_id', p_game_id,
    'stars', p_stars,
    'avg_stars', coalesce(v_avg, p_stars::numeric),
    'rating_count', coalesce(v_count, 1)
  );
end;
$$;

revoke all on function public.rate_game(text, integer) from public;
grant execute on function public.rate_game(text, integer) to authenticated, service_role;

create or replace function public.get_game_ratings()
returns table (
  game_id text,
  avg_stars numeric,
  rating_count bigint
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    gr.game_id,
    round(avg(gr.stars)::numeric, 2) as avg_stars,
    count(*) as rating_count
  from public.game_ratings gr
  group by gr.game_id;
$$;

revoke all on function public.get_game_ratings() from public;
grant execute on function public.get_game_ratings() to anon, authenticated, service_role;
