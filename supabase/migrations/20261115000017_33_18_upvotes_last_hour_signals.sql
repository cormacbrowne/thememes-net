-- ============================================================================
-- Migration 20261115000017 — Phase 33 task 33.18
-- Real "people here now" & truthful 1-hour upvote velocity signals:
--   1. Partial index on public.votes(meme_id, updated_at DESC) WHERE direction = 1
--   2. SECURITY DEFINER aggregate function get_meme_upvotes_last_hour(uuid)
--      returning ONLY integer count (never leaking user_id / PII).
--   3. Append upvotes_last_hour column to public.memes_feed_view.
--   4. Include upvotes_last_hour in cast_vote() RPC response for live updates.
-- ============================================================================

CREATE INDEX IF NOT EXISTS votes_meme_positive_updated_idx
  ON public.votes (meme_id, updated_at DESC)
  WHERE direction = 1;

CREATE OR REPLACE FUNCTION public.get_meme_upvotes_last_hour(p_meme_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT count(*)::integer
  FROM public.votes v
  WHERE v.meme_id = p_meme_id
    AND v.direction = 1
    AND v.updated_at >= (now() - interval '1 hour');
$$;

REVOKE ALL ON FUNCTION public.get_meme_upvotes_last_hour(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_meme_upvotes_last_hour(uuid) TO anon, authenticated;

CREATE OR REPLACE VIEW public.memes_feed_view
WITH (security_invoker = true)
AS
SELECT
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
  )::double precision AS hot_score,
  coalesce(
    (
      SELECT count(*)::integer
      FROM public.comments c
      WHERE c.meme_id = m.id
        AND c.status = 'visible'
    ),
    0
  ) AS comments_count,
  public.get_meme_upvotes_last_hour(m.id) AS upvotes_last_hour
FROM public.memes m;

GRANT SELECT ON public.memes_feed_view TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.cast_vote(p_meme_id uuid, p_direction integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_rl jsonb;
  v_meme_status text;
  v_owner uuid;
  v_owner_name text;
  v_title text;
  v_prev integer;
  v_changed boolean := false;
  v_new_score integer;
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

  if p_meme_id is null or p_direction not in (-1, 0, 1) then
    return jsonb_build_object('ok', false, 'error', 'invalid_direction');
  end if;

  select status, user_id, author_name, title
  into v_meme_status, v_owner, v_owner_name, v_title
  from public.memes
  where id = p_meme_id;

  if v_meme_status is distinct from 'approved' then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  v_rl := public.check_and_record_rate_limit(v_uid, 'vote', public.request_ip_hash(), true);
  if not coalesce((v_rl->>'ok')::boolean, false) then
    return v_rl;
  end if;

  select direction
  into v_prev
  from public.votes
  where user_id = v_uid and meme_id = p_meme_id
  for update;

  if coalesce(v_prev, 0) <> p_direction then
    v_changed := true;
    insert into public.votes (user_id, meme_id, direction)
    values (v_uid, p_meme_id, p_direction)
    on conflict (user_id, meme_id)
    do update set direction = excluded.direction, updated_at = now();
  end if;

  update public.memes m
  set score = m.base_score + coalesce((
    select sum(v.direction)::integer
    from public.votes v
    where v.meme_id = p_meme_id
  ), 0)
  where m.id = p_meme_id
  returning m.score into v_new_score;

  if v_changed and p_direction = 1 and coalesce(v_prev, 0) <= 0
     and v_owner is not null and v_owner <> v_uid then
    if not exists (
      select 1 from public.notifications n
      where n.recipient_id = v_owner
        and n.actor_id = v_uid
        and n.meme_id = p_meme_id
        and n.type = 'upvote'
        and n.created_at > now() - interval '1 hour'
    ) then
      insert into public.notifications (
        recipient_id, recipient_username, actor_id, actor_name, type, meme_id, message
      )
      values (
        v_owner,
        v_owner_name,
        v_uid,
        'Someone',
        'upvote',
        p_meme_id,
        '🔥 Someone upvoted your meme "' || left(coalesce(v_title, 'Meme'), 36) || '"!'
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'meme_id', p_meme_id,
    'user_vote', p_direction,
    'score', v_new_score,
    'changed', v_changed,
    'upvotes_last_hour', public.get_meme_upvotes_last_hour(p_meme_id)
  );
end;
$function$;
