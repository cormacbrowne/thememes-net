create or replace function public.get_year_in_memes(
  p_year integer default null,
  p_limit integer default 24
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_now_year integer := extract(year from timezone('utc', now()))::integer;
  v_year integer := coalesce(p_year, v_now_year);
  v_lim integer := greatest(1, least(coalesce(p_limit, 24), 60));
  v_top_memes jsonb;
  v_top_winners jsonb;
  v_top_creators jsonb;
  v_years jsonb;
  v_total_memes integer := 0;
  v_total_real_votes bigint := 0;
  v_total_battles integer := 0;
begin
  select coalesce(jsonb_agg(to_jsonb(q) order by q.real_votes desc, q.created_at desc), '[]'::jsonb)
  into v_top_memes
  from (
    select
      m.id,
      m.title,
      m.category,
      m.image_url,
      m.poster_url,
      m.media_type,
      m.author_name,
      m.user_id,
      m.created_at,
      greatest(0, coalesce(m.score, 0) - coalesce(m.base_score, 0)) as real_votes
    from public.memes m
    where m.status = 'approved'
      and extract(year from timezone('utc', m.created_at))::integer = v_year
      and greatest(0, coalesce(m.score, 0) - coalesce(m.base_score, 0)) > 0
    order by real_votes desc, m.created_at desc
    limit v_lim
  ) q;

  select
    count(*)::integer,
    coalesce(sum(greatest(0, coalesce(m.score, 0) - coalesce(m.base_score, 0))), 0)::bigint
  into v_total_memes, v_total_real_votes
  from public.memes m
  where m.status = 'approved'
    and extract(year from timezone('utc', m.created_at))::integer = v_year
    and greatest(0, coalesce(m.score, 0) - coalesce(m.base_score, 0)) > 0;

  select coalesce(jsonb_agg(to_jsonb(q) order by q.winning_score desc, q.battle_date desc), '[]'::jsonb)
  into v_top_winners
  from (
    select
      w.battle_date,
      w.battle_id,
      w.entry_id,
      w.user_id,
      w.author_name,
      w.template_id,
      w.image_url,
      w.top_text,
      w.bottom_text,
      coalesce(w.winning_score, 0) as winning_score
    from public.caption_battle_winners w
    where extract(year from w.battle_date)::integer = v_year
    order by coalesce(w.winning_score, 0) desc, w.battle_date desc
    limit least(v_lim, 24)
  ) q;

  select count(*)::integer
  into v_total_battles
  from public.caption_battle_winners w
  where extract(year from w.battle_date)::integer = v_year;

  select coalesce(jsonb_agg(to_jsonb(c) order by (c.total_votes + c.battle_wins * 25) desc, c.author_name asc), '[]'::jsonb)
  into v_top_creators
  from (
    select
      combined.author_name,
      sum(combined.votes)::bigint as total_votes,
      sum(combined.wins)::integer as wins_alias
    from (
      select
        coalesce(nullif(trim(m.author_name), ''), 'Anon') as author_name,
        greatest(0, coalesce(m.score, 0) - coalesce(m.base_score, 0))::bigint as votes,
        0::integer as wins
      from public.memes m
      where m.status = 'approved'
        and extract(year from timezone('utc', m.created_at))::integer = v_year
        and greatest(0, coalesce(m.score, 0) - coalesce(m.base_score, 0)) > 0
      union all
      select
        coalesce(nullif(trim(w.author_name), ''), 'Anon') as author_name,
        coalesce(w.winning_score, 0)::bigint as votes,
        1::integer as wins
      from public.caption_battle_winners w
      where extract(year from w.battle_date)::integer = v_year
    ) combined
    group by combined.author_name
    order by (sum(combined.votes) + sum(combined.wins) * 25) desc, combined.author_name asc
    limit 12
  ) c;

  select coalesce(jsonb_agg(y.yr order by y.yr desc), jsonb_build_array(v_now_year))
  into v_years
  from (
    select v_now_year as yr
    union
    select v_year as yr
    union
    select extract(year from timezone('utc', m.created_at))::integer as yr
    from public.memes m
    where m.status = 'approved'
      and greatest(0, coalesce(m.score, 0) - coalesce(m.base_score, 0)) > 0
    union
    select extract(year from w.battle_date)::integer as yr
    from public.caption_battle_winners w
  ) y;

  return jsonb_build_object(
    'ok', true,
    'year', v_year,
    'top_memes', v_top_memes,
    'top_battle_winners', v_top_winners,
    'top_creators', v_top_creators,
    'summary', jsonb_build_object(
      'year', v_year,
      'total_memes', v_total_memes,
      'total_real_votes', v_total_real_votes,
      'total_battles_won', v_total_battles,
      'available_years', v_years
    )
  );
end;
$function$;

revoke execute on function public.get_year_in_memes(integer, integer) from public;
grant execute on function public.get_year_in_memes(integer, integer) to anon, authenticated, service_role;
