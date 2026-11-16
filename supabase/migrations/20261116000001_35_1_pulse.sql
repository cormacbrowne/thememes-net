-- Phase 35 task 35.1: Pulse (private, first-party anonymous stats)
-- No cookies, no client-side tracking IDs, no raw IPs.
-- Daily-rotated salt makes visitor hashes unlinkable across UTC days.
-- Raw events are rolled up daily and deleted after 30 days.

-- 1. Raw events table (no policies: service_role and security definer functions only)
create table if not exists public.pulse_events (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  day date not null default (now() at time zone 'utc')::date,
  visitor text not null,
  session text not null,
  name text not null,
  path text,
  ref_host text,
  src text,
  device text check (device in ('phone', 'tablet', 'desktop')),
  returning boolean not null default false,
  props jsonb not null default '{}'::jsonb
);

create index if not exists pulse_events_day_name_idx
  on public.pulse_events (day, name);

create index if not exists pulse_events_visitor_ts_idx
  on public.pulse_events (visitor, ts desc);

alter table public.pulse_events enable row level security;
revoke all on table public.pulse_events from public, anon, authenticated;

-- 2. Daily rotating salts (yesterday's salt is deleted at 00:05 UTC)
create table if not exists public.pulse_salts (
  day date primary key,
  salt text not null
);

alter table public.pulse_salts enable row level security;
revoke all on table public.pulse_salts from public, anon, authenticated;

-- 3. Daily rolled-up aggregates
create table if not exists public.pulse_daily (
  day date not null,
  name text not null,
  path text not null default '',
  src text not null default '',
  device text not null default '',
  events int not null default 0,
  visitors int not null default 0,
  sessions int not null default 0,
  sum_ms bigint not null default 0,
  primary key (day, name, path, src, device)
);

alter table public.pulse_daily enable row level security;
revoke all on table public.pulse_daily from public, anon, authenticated;

-- 4. Salt rotation & rollup helpers (cron-only / service_role)
create or replace function public.pulse_rotate_salt()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
begin
  insert into public.pulse_salts (day, salt)
  values (v_today, encode(extensions.gen_random_bytes(16), 'hex'))
  on conflict (day) do nothing;

  delete from public.pulse_salts
  where day < v_today;
end;
$$;

revoke all on function public.pulse_rotate_salt() from public, anon, authenticated;
grant execute on function public.pulse_rotate_salt() to service_role;

create or replace function public.pulse_rollup(
  p_day date default ((now() at time zone 'utc')::date - 1)
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.pulse_daily (day, name, path, src, device, events, visitors, sessions, sum_ms)
  select
    e.day,
    e.name,
    coalesce(e.path, ''),
    coalesce(e.src, ''),
    coalesce(e.device, ''),
    count(*)::int,
    count(distinct e.visitor)::int,
    count(distinct e.session)::int,
    coalesce(
      sum((e.props->>'ms')::bigint)
        filter (where e.props ? 'ms' and (e.props->>'ms') ~ '^\d{1,12}$'),
      0
    )::bigint
  from public.pulse_events e
  where e.day = p_day
  group by e.day, e.name, coalesce(e.path, ''), coalesce(e.src, ''), coalesce(e.device, '')
  on conflict (day, name, path, src, device) do update set
    events = excluded.events,
    visitors = excluded.visitors,
    sessions = excluded.sessions,
    sum_ms = excluded.sum_ms;

  delete from public.pulse_events
  where day < ((now() at time zone 'utc')::date - 30);
end;
$$;

revoke all on function public.pulse_rollup(date) from public, anon, authenticated;
grant execute on function public.pulse_rollup(date) to service_role;

-- 5. Public ingest RPC: pulse(p_session, p_events)
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
    'game_started'
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

    insert into public.pulse_events (day, visitor, session, name, path, ref_host, src, device, returning, props)
    values (v_day, v_visitor, v_session, v_name, v_path, v_ref_host, v_src, v_device, v_returning, v_clean_props);
  end loop;
exception when others then
  return;
end;
$$;

revoke all on function public.pulse(text, jsonb) from public;
grant execute on function public.pulse(text, jsonb) to anon, authenticated;

-- 6. Moderator-only read RPC: pulse_report(p_days)
create or replace function public.pulse_report(p_days int default 14)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_days int := greatest(1, least(coalesce(p_days, 14), 30));
  v_today date := (now() at time zone 'utc')::date;
  v_start date := (now() at time zone 'utc')::date - (greatest(1, least(coalesce(p_days, 14), 30)) - 1);
  v_today_summary jsonb;
  v_period_summary jsonb;
  v_daily jsonb;
  v_sources jsonb;
  v_first_screens jsonb;
  v_games jsonb;
  v_funnel jsonb;
  v_features jsonb;
  v_errors jsonb;
  v_total_sessions int;
begin
  if not public.is_moderator() then
    raise exception 'forbidden';
  end if;

  -- Today summary
  with sess as (
    select
      session,
      bool_or(returning) as is_returning,
      bool_or(name = 'first_action') as has_action,
      extract(epoch from (max(ts) - min(ts))) * 1000.0 as dur_ms
    from public.pulse_events
    where day = v_today
    group by session
  )
  select jsonb_build_object(
    'visitors', (select count(distinct visitor) from public.pulse_events where day = v_today),
    'sessions', count(*),
    'bounces', count(*) filter (where not has_action),
    'bounce_pct', case when count(*) > 0 then round((count(*) filter (where not has_action)) * 100.0 / count(*), 1) else 0 end,
    'median_session_ms', coalesce((select percentile_cont(0.5) within group (order by dur_ms) from sess), 0)::bigint,
    'new_sessions', count(*) filter (where not is_returning),
    'returning_sessions', count(*) filter (where is_returning)
  ) into v_today_summary
  from sess;

  -- Period summary
  with sess as (
    select
      session,
      bool_or(returning) as is_returning,
      bool_or(name = 'first_action') as has_action,
      extract(epoch from (max(ts) - min(ts))) * 1000.0 as dur_ms
    from public.pulse_events
    where day >= v_start
    group by session
  )
  select
    count(*)::int,
    jsonb_build_object(
      'days', v_days,
      'visitors', (select count(distinct visitor) from public.pulse_events where day >= v_start),
      'sessions', count(*),
      'bounces', count(*) filter (where not has_action),
      'bounce_pct', case when count(*) > 0 then round((count(*) filter (where not has_action)) * 100.0 / count(*), 1) else 0 end,
      'median_session_ms', coalesce((select percentile_cont(0.5) within group (order by dur_ms) from sess), 0)::bigint,
      'new_sessions', count(*) filter (where not is_returning),
      'returning_sessions', count(*) filter (where is_returning)
    )
  into v_total_sessions, v_period_summary
  from sess;

  -- Daily series
  select coalesce(jsonb_agg(row_to_json(d) order by d.day), '[]'::jsonb)
  into v_daily
  from (
    select
      day,
      count(distinct visitor)::int as visitors,
      count(distinct session)::int as sessions,
      count(*) filter (where name = 'view')::int as views
    from public.pulse_events
    where day >= v_start
    group by day
  ) d;

  -- Where they came from
  select coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb)
  into v_sources
  from (
    select
      coalesce(nullif(src, ''), '(direct)') as src,
      coalesce(nullif(ref_host, ''), '(none)') as ref_host,
      count(distinct visitor)::int as visitors,
      count(distinct session)::int as sessions
    from public.pulse_events
    where day >= v_start
    group by 1, 2
    order by sessions desc
    limit 20
  ) s;

  -- First screen (first view per session + bounce %)
  select coalesce(jsonb_agg(row_to_json(fs)), '[]'::jsonb)
  into v_first_screens
  from (
    with first_views as (
      select distinct on (session)
        session,
        coalesce(nullif(path, ''), '/') as path
      from public.pulse_events
      where day >= v_start and name = 'view'
      order by session, ts asc
    ),
    actions as (
      select distinct session
      from public.pulse_events
      where day >= v_start and name = 'first_action'
    )
    select
      fv.path,
      count(*)::int as sessions,
      count(*) filter (where a.session is null)::int as bounces,
      case when count(*) > 0 then round((count(*) filter (where a.session is null)) * 100.0 / count(*), 1) else 0 end as bounce_pct
    from first_views fv
    left join actions a on a.session = fv.session
    group by fv.path
    order by sessions desc
    limit 20
  ) fs;

  -- Games league table
  select coalesce(jsonb_agg(row_to_json(g)), '[]'::jsonb)
  into v_games
  from (
    with game_starts as (
      select
        session,
        coalesce(props->>'game', 'unknown') as game,
        count(*)::int as starts
      from public.pulse_events
      where day >= v_start and name = 'game_start'
      group by session, coalesce(props->>'game', 'unknown')
    ),
    session_game_counts as (
      select session, count(distinct game)::int as games_played
      from game_starts
      group by session
    ),
    game_ends as (
      select
        coalesce(props->>'game', 'unknown') as game,
        count(*)::int as ends,
        coalesce(sum((props->>'ms')::bigint) filter (where (props->>'ms') ~ '^\d{1,12}$'), 0)::bigint as total_ms,
        coalesce(percentile_cont(0.5) within group (order by (props->>'ms')::bigint) filter (where (props->>'ms') ~ '^\d{1,12}$'), 0)::bigint as median_ms,
        coalesce(round(avg((props->>'rounds')::numeric) filter (where (props->>'rounds') ~ '^\d{1,9}$'), 1), 0) as avg_rounds
      from public.pulse_events
      where day >= v_start and name = 'game_end'
      group by coalesce(props->>'game', 'unknown')
    )
    select
      gs.game,
      sum(gs.starts)::int as starts,
      coalesce(ge.ends, 0)::int as ends,
      coalesce(ge.total_ms, 0)::bigint as total_ms,
      coalesce(ge.median_ms, 0)::bigint as median_ms,
      coalesce(ge.avg_rounds, 0) as avg_rounds,
      case
        when count(distinct gs.session) > 0
        then round((count(distinct gs.session) filter (where sgc.games_played >= 2)) * 100.0 / count(distinct gs.session), 1)
        else 0
      end as second_game_pct
    from game_starts gs
    join session_game_counts sgc on sgc.session = gs.session
    left join game_ends ge on ge.game = gs.game
    group by gs.game, ge.ends, ge.total_ms, ge.median_ms, ge.avg_rounds
    order by coalesce(ge.total_ms, 0) desc, sum(gs.starts) desc
  ) g;

  -- Meme funnel
  select jsonb_build_object(
    'feed_views', count(distinct session) filter (where name = 'view' and coalesce(props->>'mode', '') = 'feed'),
    'forge_open', count(distinct session) filter (where name = 'forge_open'),
    'forge_export', count(distinct session) filter (where name = 'forge_export'),
    'publish_ok', count(distinct session) filter (where name = 'publish_ok'),
    'publish_refused', count(*) filter (where name = 'publish_refused')
  ) into v_funnel
  from public.pulse_events
  where day >= v_start;

  -- Feature use (% of sessions touching each toy)
  select coalesce(jsonb_agg(row_to_json(f)), '[]'::jsonb)
  into v_features
  from (
    select
      coalesce(props->>'feature', 'unknown') as feature,
      count(distinct session)::int as sessions,
      case when v_total_sessions > 0 then round(count(distinct session) * 100.0 / v_total_sessions, 1) else 0 end as pct
    from public.pulse_events
    where day >= v_start and name = 'feature_use'
    group by 1
    order by sessions desc
  ) f;

  -- Top 10 client errors
  select coalesce(jsonb_agg(row_to_json(err)), '[]'::jsonb)
  into v_errors
  from (
    select
      coalesce(props->>'where', 'unknown') as where,
      coalesce(props->>'message', '') as message,
      count(*)::int as count,
      max(ts) as last_seen
    from public.pulse_events
    where day >= v_start and name = 'client_error'
    group by 1, 2
    order by count desc, last_seen desc
    limit 10
  ) err;

  return jsonb_build_object(
    'today', v_today_summary,
    'period', v_period_summary,
    'daily', v_daily,
    'sources', v_sources,
    'first_screens', v_first_screens,
    'games', v_games,
    'funnel', v_funnel,
    'features', v_features,
    'errors', v_errors
  );
end;
$$;

revoke all on function public.pulse_report(int) from public, anon;
grant execute on function public.pulse_report(int) to authenticated;

-- 7. Weekly digest webhook (Monday 08:00 UTC, reuses moderation_digest_webhook_url)
create or replace function public.pulse_weekly_digest_send()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_this_start date := (now() at time zone 'utc')::date - 7;
  v_prev_start date := (now() at time zone 'utc')::date - 14;
  v_vis_this int;
  v_vis_prev int;
  v_pub_this int;
  v_pub_prev int;
  v_sess_this int;
  v_sess_prev int;
  v_top_sources text;
  v_top_games text;
  v_biggest_drop text := 'None';
  v_drop_pct numeric := 0;
  v_url text;
  v_text text;
  v_sent boolean := false;
begin
  select
    count(distinct visitor) filter (where day >= v_this_start and day < v_today)::int,
    count(distinct visitor) filter (where day >= v_prev_start and day < v_this_start)::int,
    count(distinct session) filter (where day >= v_this_start and day < v_today)::int,
    count(distinct session) filter (where day >= v_prev_start and day < v_this_start)::int,
    count(*) filter (where day >= v_this_start and day < v_today and name = 'publish_ok')::int,
    count(*) filter (where day >= v_prev_start and day < v_this_start and name = 'publish_ok')::int
  into v_vis_this, v_vis_prev, v_sess_this, v_sess_prev, v_pub_this, v_pub_prev
  from public.pulse_events
  where day >= v_prev_start and day < v_today;

  select coalesce(string_agg(src_line, ', '), 'none') into v_top_sources
  from (
    select coalesce(nullif(src, ''), nullif(ref_host, ''), 'direct') || ' (' || count(distinct session) || ')' as src_line
    from public.pulse_events
    where day >= v_this_start and day < v_today
    group by 1
    order by count(distinct session) desc
    limit 3
  ) s;

  select coalesce(string_agg(game_line, ', '), 'none') into v_top_games
  from (
    select
      coalesce(props->>'game', 'unknown') || ' (' ||
      round(coalesce(sum((props->>'ms')::bigint) filter (where (props->>'ms') ~ '^\d{1,12}$'), 0) / 60000.0, 1) || 'm)' as game_line
    from public.pulse_events
    where day >= v_this_start and day < v_today and name = 'game_end'
    group by 1
    order by coalesce(sum((props->>'ms')::bigint) filter (where (props->>'ms') ~ '^\d{1,12}$'), 0) desc
    limit 3
  ) g;

  if v_vis_prev > 0 and ((v_vis_this - v_vis_prev) * 100.0 / v_vis_prev) < v_drop_pct then
    v_drop_pct := round((v_vis_this - v_vis_prev) * 100.0 / v_vis_prev, 1);
    v_biggest_drop := 'Visitors (' || v_vis_prev || ' -> ' || v_vis_this || ', ' || v_drop_pct || '%)';
  end if;
  if v_sess_prev > 0 and ((v_sess_this - v_sess_prev) * 100.0 / v_sess_prev) < v_drop_pct then
    v_drop_pct := round((v_sess_this - v_sess_prev) * 100.0 / v_sess_prev, 1);
    v_biggest_drop := 'Sessions (' || v_sess_prev || ' -> ' || v_sess_this || ', ' || v_drop_pct || '%)';
  end if;
  if v_pub_prev > 0 and ((v_pub_this - v_pub_prev) * 100.0 / v_pub_prev) < v_drop_pct then
    v_drop_pct := round((v_pub_this - v_pub_prev) * 100.0 / v_pub_prev, 1);
    v_biggest_drop := 'Memes published (' || v_pub_prev || ' -> ' || v_pub_this || ', ' || v_drop_pct || '%)';
  end if;

  v_text := format(
    E'**THE MEMES.net — weekly Pulse digest**\nVisitors: %s (last week: %s)\nTop 3 sources: %s\nTop 3 games (by mins): %s\nMemes published: %s (last week: %s)\nBiggest drop: %s\nReport: https://thememes.net/admin/pulse',
    v_vis_this, v_vis_prev, v_top_sources, v_top_games, v_pub_this, v_pub_prev, v_biggest_drop
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

  return jsonb_build_object(
    'visitors_this_week', v_vis_this,
    'visitors_last_week', v_vis_prev,
    'memes_published', v_pub_this,
    'biggest_drop', v_biggest_drop,
    'sent', v_sent
  );
end;
$$;

revoke all on function public.pulse_weekly_digest_send() from public, anon, authenticated;
grant execute on function public.pulse_weekly_digest_send() to service_role;

-- 8. Cron schedules (pg_cron)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'pulse-rotate-salt') then
    perform cron.unschedule('pulse-rotate-salt');
  end if;
  perform cron.schedule('pulse-rotate-salt', '5 0 * * *', 'select public.pulse_rotate_salt();');

  if exists (select 1 from cron.job where jobname = 'pulse-daily-rollup') then
    perform cron.unschedule('pulse-daily-rollup');
  end if;
  perform cron.schedule('pulse-daily-rollup', '15 0 * * *', 'select public.pulse_rollup();');

  if exists (select 1 from cron.job where jobname = 'pulse-weekly-digest') then
    perform cron.unschedule('pulse-weekly-digest');
  end if;
  perform cron.schedule('pulse-weekly-digest', '0 8 * * 1', 'select public.pulse_weekly_digest_send();');
end
$$;
