-- ============================================================================
-- Plan 1.4 — allow the plan's analytics events through Pulse (first-party, cookieless).
-- Same function as migration 35_1 with these names added to v_allowed_names:
--   meme_created, meme_shared, meme_downloaded, vote_cast, reaction_added, battle_entry,
--   battle_vote, guess_the_meme_completed, share_card_copied, prank_opened, signup,
--   return_visit  (game_started already existed).
-- ============================================================================

create or replace function public.pulse(p_session text, p_events jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_headers jsonb := '{}'::jsonb;
  v_ua text := '';
  v_day date := (now() at time zone 'utc')::date;
  v_salt text;
  v_visitor text;
  v_recent_count int;
  v_session text;
  v_ev jsonb;
  v_name text;
  v_path text;
  v_ref_host text;
  v_src text;
  v_device text;
  v_returning boolean;
  v_raw_props jsonb;
  v_clean_props jsonb;
  v_k text;
  v_val jsonb;
  v_candidate jsonb;
  v_allowed_names constant text[] := array[
    'view',
    'first_action',
    'feed_depth',
    'game_start',
    'game_end',
    'slot_spin_batch',
    'forge_open',
    'forge_export',
    'publish_ok',
    'publish_refused',
    'share',
    'feature_use',
    'client_error',
    'wallet_empty',
    'meme_viewed',
    'meme_upvote',
    'remix_opened',
    'meme_published',
    'share_clicked',
    'game_started',
    'meme_created',
    'meme_shared',
    'meme_downloaded',
    'vote_cast',
    'reaction_added',
    'battle_entry',
    'battle_vote',
    'guess_the_meme_completed',
    'share_card_copied',
    'prank_opened',
    'signup',
    'return_visit'
  ];
begin
  if p_session is null or length(btrim(p_session)) = 0 or length(p_session) > 64 then
    return;
  end if;
  v_session := left(btrim(p_session), 64);

  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    return;
  end if;
  if jsonb_array_length(p_events) = 0 or jsonb_array_length(p_events) > 25 then
    return;
  end if;

  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_ua := coalesce(v_headers->>'user-agent', '');
  if v_ua ~* '(bot|crawl|spider|headless|lighthouse)' then
    return;
  end if;

  -- Ensure today's salt exists, then compute today's unlinkable visitor hash
  insert into public.pulse_salts (day, salt)
  values (v_day, encode(extensions.gen_random_bytes(16), 'hex'))
  on conflict (day) do nothing;

  select s.salt into v_salt
  from public.pulse_salts s
  where s.day = v_day;

  if v_salt is null then
    return;
  end if;

  v_visitor := left(
    encode(
      extensions.digest(
        convert_to(coalesce(public.request_ip_hash(), 'noip') || ':' || v_salt, 'utf8'),
        'sha256'
      ),
      'hex'
    ),
    16
  );

  select count(*)::int into v_recent_count
  from public.pulse_events
  where visitor = v_visitor
    and ts > now() - interval '10 minutes';

  if v_recent_count > 300 then
    return;
  end if;

  for v_ev in select * from jsonb_array_elements(p_events)
  loop
    if jsonb_typeof(v_ev) <> 'object' then
      continue;
    end if;

    v_name := coalesce(v_ev->>'name', '');
    if v_name !~ '^[a-z][a-z0-9_]{1,31}$' or not (v_name = any(v_allowed_names)) then
      continue;
    end if;

    v_path := nullif(left(split_part(split_part(coalesce(v_ev->>'path', ''), '?', 1), '#', 1), 80), '');

    v_ref_host := lower(btrim(coalesce(v_ev->>'ref_host', '')));
    v_ref_host := regexp_replace(v_ref_host, '^https?://', '');
    v_ref_host := split_part(v_ref_host, '/', 1);
    v_ref_host := split_part(v_ref_host, ':', 1);
    v_ref_host := nullif(left(v_ref_host, 80), '');

    v_src := nullif(btrim(coalesce(v_ev->>'src', '')), '');
    if v_src is not null and v_src !~ '^[a-zA-Z0-9_-]{1,24}$' then
      v_src := null;
    end if;

    v_device := v_ev->>'device';
    if v_device not in ('phone', 'tablet', 'desktop') then
      v_device := 'desktop';
    end if;

    v_returning := coalesce((v_ev->>'returning')::boolean, false);

    v_raw_props := case when jsonb_typeof(v_ev->'props') = 'object' then v_ev->'props' else '{}'::jsonb end;
    v_clean_props := '{}'::jsonb;
    for v_k, v_val in select * from jsonb_each(v_raw_props)
    loop
      if length(v_k) > 32 then
        continue;
      end if;
      if jsonb_typeof(v_val) = 'string' then
        v_val := to_jsonb(left(v_val #>> '{}', 120));
      elsif jsonb_typeof(v_val) not in ('number', 'boolean') then
        continue;
      end if;
      v_candidate := v_clean_props || jsonb_build_object(v_k, v_val);
      if octet_length(v_candidate::text) <= 600 then
        v_clean_props := v_candidate;
      end if;
    end loop;

    insert into public.pulse_events (day, visitor, session, name, path, ref_host, src, device, returning_visitor, props)
    values (v_day, v_visitor, v_session, v_name, v_path, v_ref_host, v_src, v_device, v_returning, v_clean_props);
  end loop;
exception when others then
  return;
end;
$$;

revoke all on function public.pulse(text, jsonb) from public;
grant execute on function public.pulse(text, jsonb) to anon, authenticated;
