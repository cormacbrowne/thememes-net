-- Phase 33.17: Creator Profile Pages (/u/<handle>), Built-in Pixel-Art Avatars & Follows
-- Removes avatar upload moderation surface by locking avatar_id to 12 built-in pixel-art avatars,
-- adds public.follows with strict RLS, indexes author lookups, and adds creator profile & follow RPCs.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_id text NOT NULL DEFAULT 'pixel-alien';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_avatar_id_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_id_chk CHECK (
    avatar_id = ANY (ARRAY[
      'pixel-alien',
      'neon-cat',
      'synth-knight',
      'laser-duck',
      'robo-goblin',
      'arcade-wizard',
      'cyber-frog',
      'crown-slime',
      'crt-bot',
      'ghost-86',
      'star-knight',
      'turbo-shiba'
    ])
  );

CREATE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS memes_approved_author_lower_created_idx
  ON public.memes (lower(author_name), created_at DESC, id DESC)
  WHERE status = 'approved' AND author_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS scores_user_game_score_idx
  ON public.scores (user_id, game, score DESC);

-- Follows table (stored with lowercase normalized handle; RLS restricts direct reads to own rows)
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_handle text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_handle),
  CONSTRAINT follows_handle_format_chk CHECK (followed_handle ~ '^[a-z0-9_-]{2,32}$')
);

CREATE INDEX IF NOT EXISTS follows_handle_created_idx
  ON public.follows (followed_handle, created_at DESC);

CREATE INDEX IF NOT EXISTS follows_follower_created_idx
  ON public.follows (follower_id, created_at DESC);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own follows" ON public.follows;
CREATE POLICY "Users can read their own follows"
  ON public.follows
  FOR SELECT
  TO authenticated
  USING (follower_id = (SELECT auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.follows FROM anon, authenticated;

-- Allow 'follow' inside rate_limit_events action constraint
ALTER TABLE public.rate_limit_events
  DROP CONSTRAINT IF EXISTS rate_limit_events_action_check;

ALTER TABLE public.rate_limit_events
  ADD CONSTRAINT rate_limit_events_action_check CHECK (
    action = ANY (ARRAY['upload', 'upload_sign', 'comment', 'vote', 'report', 'follow'])
  );

-- Update get_my_profile() to include avatar_id
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  INSERT INTO public.profiles (id)
  VALUES (v_uid)
  ON CONFLICT (id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.profiles
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'username', v_row.username,
    'avatar_id', v_row.avatar_id,
    'role', v_row.role,
    'strikes', v_row.strikes,
    'suspended_until', v_row.suspended_until
  );
END;
$function$;

-- Pick one of the 12 built-in pixel-art avatars (no image uploads)
CREATE OR REPLACE FUNCTION public.set_my_avatar(p_avatar_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_clean text := lower(trim(COALESCE(p_avatar_id, '')));
  v_allowed text[] := ARRAY[
    'pixel-alien',
    'neon-cat',
    'synth-knight',
    'laser-duck',
    'robo-goblin',
    'arcade-wizard',
    'cyber-frog',
    'crown-slime',
    'crt-bot',
    'ghost-86',
    'star-knight',
    'turbo-shiba'
  ];
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized', 'message', 'Sign in first to customize your pixel avatar.');
  END IF;

  IF public.is_suspended(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'suspended', 'message', 'Your account is currently suspended.');
  END IF;

  IF NOT (v_clean = ANY(v_allowed)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_avatar', 'message', 'Choose one of the built-in pixel-art avatars.');
  END IF;

  INSERT INTO public.profiles (id, avatar_id)
  VALUES (v_uid, v_clean)
  ON CONFLICT (id) DO UPDATE SET avatar_id = EXCLUDED.avatar_id;

  RETURN jsonb_build_object('ok', true, 'avatar_id', v_clean);
END;
$function$;

REVOKE ALL ON FUNCTION public.set_my_avatar(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_my_avatar(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_my_avatar(text) TO authenticated;

-- Toggle following a creator handle (rate-limited, blocks self-follow when claimed handle matches)
CREATE OR REPLACE FUNCTION public.toggle_follow_creator(p_handle text, p_active boolean DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_handle text := lower(regexp_replace(trim(COALESCE(p_handle, '')), '^@+', ''));
  v_my_handle text;
  v_exists boolean;
  v_next boolean;
  v_recent integer := 0;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized', 'message', 'Sign in to follow creators.');
  END IF;

  IF public.is_suspended(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'suspended', 'message', 'Your account is currently suspended.');
  END IF;

  IF v_handle !~ '^[a-z0-9_-]{2,32}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_handle', 'message', 'Invalid creator handle.');
  END IF;

  SELECT lower(username) INTO v_my_handle
  FROM public.profiles
  WHERE id = v_uid;

  IF v_my_handle IS NOT NULL AND v_my_handle = v_handle THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self_follow', 'message', 'You cannot follow your own creator handle.');
  END IF;

  -- 40 follow toggles per hour per account (self-contained; the shared limiter has no 'follow' tier)
  SELECT count(*)::integer INTO v_recent
  FROM public.rate_limit_events e
  WHERE e.action = 'follow'
    AND e.user_id = v_uid
    AND e.created_at > now() - interval '1 hour';

  IF v_recent >= 40 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'rate_limited',
      'retry_after_seconds', 600,
      'message', public.format_rate_limit_message(600)
    );
  END IF;

  INSERT INTO public.rate_limit_events (action, user_id, ip_hash)
  VALUES ('follow', v_uid, public.request_ip_hash());

  SELECT EXISTS(
    SELECT 1 FROM public.follows
    WHERE follower_id = v_uid AND followed_handle = v_handle
  ) INTO v_exists;

  v_next := COALESCE(p_active, NOT v_exists);

  IF v_next AND NOT v_exists THEN
    INSERT INTO public.follows (follower_id, followed_handle)
    VALUES (v_uid, v_handle)
    ON CONFLICT DO NOTHING;
  ELSIF NOT v_next AND v_exists THEN
    DELETE FROM public.follows
    WHERE follower_id = v_uid AND followed_handle = v_handle;
  END IF;

  SELECT count(*)::integer INTO v_count
  FROM public.follows
  WHERE followed_handle = v_handle;

  RETURN jsonb_build_object(
    'ok', true,
    'handle', v_handle,
    'following', v_next,
    'follower_count', v_count
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.toggle_follow_creator(text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_follow_creator(text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_follow_creator(text, boolean) TO authenticated;

-- Public creator profile summary for /u/<handle> (no private profile columns exposed)
CREATE OR REPLACE FUNCTION public.get_creator_profile(p_handle text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_raw text := regexp_replace(trim(COALESCE(p_handle, '')), '^@+', '');
  v_handle text := lower(v_raw);
  v_profile RECORD;
  v_follower_count integer := 0;
  v_is_following boolean := false;
  v_is_caption_king boolean := false;
  v_caption_wins integer := 0;
  v_memes_count integer := 0;
  v_total_score integer := 0;
  v_total_remixes integer := 0;
  v_memes jsonb := '[]'::jsonb;
  v_scores jsonb := '[]'::jsonb;
  v_display_handle text := v_raw;
BEGIN
  IF v_handle !~ '^[a-z0-9_-]{2,32}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_handle');
  END IF;

  SELECT id, username, avatar_id, created_at
  INTO v_profile
  FROM public.profiles
  WHERE lower(username) = v_handle
  LIMIT 1;

  IF v_profile.username IS NOT NULL THEN
    v_display_handle := v_profile.username;
  END IF;

  SELECT count(*)::integer INTO v_follower_count
  FROM public.follows
  WHERE followed_handle = v_handle;

  IF v_uid IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.follows
      WHERE follower_id = v_uid AND followed_handle = v_handle
    ) INTO v_is_following;
  END IF;

  SELECT
    count(*)::integer,
    COALESCE(bool_or(crowned_until > now()), false)
  INTO v_caption_wins, v_is_caption_king
  FROM public.caption_battle_winners
  WHERE lower(author_name) = v_handle;

  SELECT
    count(*)::integer,
    COALESCE(sum(score), 0)::integer,
    COALESCE(sum(mutation_count), 0)::integer
  INTO v_memes_count, v_total_score, v_total_remixes
  FROM public.memes
  WHERE status = 'approved'
    AND (
      lower(author_name) = v_handle
      OR (v_profile.id IS NOT NULL AND user_id = v_profile.id)
    );

  SELECT COALESCE(jsonb_agg(row_to_json(m_row)), '[]'::jsonb)
  INTO v_memes
  FROM (
    SELECT
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
    FROM public.memes_feed_view
    WHERE lower(author_name) = v_handle
    ORDER BY score DESC, created_at DESC, id DESC
    LIMIT 48
  ) m_row;

  IF v_profile.id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(row_to_json(s_row)), '[]'::jsonb)
    INTO v_scores
    FROM (
      SELECT DISTINCT ON (s.game)
        s.game,
        s.score AS high_score,
        s.initials,
        s.created_at AS achieved_at
      FROM public.scores s
      WHERE s.user_id = v_profile.id
      ORDER BY s.game, s.score DESC, s.created_at DESC
    ) s_row;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'handle', v_display_handle,
    'normalized_handle', v_handle,
    'found', (v_profile.id IS NOT NULL OR v_memes_count > 0 OR v_caption_wins > 0),
    'verified', (v_profile.id IS NOT NULL),
    'avatar_id', COALESCE(v_profile.avatar_id, 'pixel-alien'),
    'joined_at', v_profile.created_at,
    'follower_count', v_follower_count,
    'is_following', v_is_following,
    'is_caption_king', v_is_caption_king,
    'caption_wins', v_caption_wins,
    'stats', jsonb_build_object(
      'memes_count', v_memes_count,
      'total_score', v_total_score,
      'total_remixes', v_total_remixes
    ),
    'memes', v_memes,
    'high_scores', v_scores
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_creator_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creator_profile(text) TO anon, authenticated;
