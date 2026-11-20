-- Phase 2.5: Profile bio + level/streak/battle/wholesome creator profile stats

alter table public.profiles
  add column if not exists bio text not null default '' check (char_length(bio) <= 160);

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
    'bio', coalesce(v_row.bio, ''),
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

  select id, username, avatar_id, created_at, bio, xp, streak_days, best_streak
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
      mutation_count,
      parent_meme_id,
      root_meme_id,
      generation,
      created_at
    from public.memes_feed_view
    where lower(author_name) = v_handle
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
