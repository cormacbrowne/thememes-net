-- Phase 33 task 33.7: Postgres-backed per-user and per-IP-hash rate limits
-- (uploads 5/hr & 20/day standard, 15/hr & 60/day linked >= 24h;
--  comments 1/10s & 60/day standard, 1/5s & 120/day linked >= 24h;
--  votes 120/hr standard, 300/hr linked >= 24h;
--  reports 1/3s & 20/day standard, 1/3s & 40/day linked >= 24h).

create table if not exists public.rate_limit_events (
  id bigint generated always as identity primary key,
  action text not null check (action in ('upload', 'upload_sign', 'comment', 'vote', 'report')),
  user_id uuid not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_user_action_idx
  on public.rate_limit_events (user_id, action, created_at desc);

create index if not exists rate_limit_events_ip_action_idx
  on public.rate_limit_events (ip_hash, action, created_at desc)
  where ip_hash is not null;

alter table public.rate_limit_events enable row level security;
revoke all on table public.rate_limit_events from public, anon, authenticated;

create or replace function public.request_ip_hash()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_headers jsonb;
  v_ip text;
begin
  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  exception when others then
    return null;
  end;

  v_ip := coalesce(
    nullif(btrim(v_headers->>'cf-connecting-ip'), ''),
    nullif(btrim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1)), ''),
    nullif(btrim(v_headers->>'x-real-ip'), '')
  );

  if v_ip is null then
    return null;
  end if;

  return encode(extensions.digest(convert_to('tm_rl_v1:' || v_ip, 'utf8'), 'sha256'), 'hex');
end;
$$;

revoke all on function public.request_ip_hash() from public, anon, authenticated;

create or replace function public.is_established_account(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and coalesce(u.is_anonymous, false) = false
      and u.created_at <= now() - interval '24 hours'
  );
$$;

revoke all on function public.is_established_account(uuid) from public, anon, authenticated;

create or replace function public.format_rate_limit_message(p_seconds integer)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_secs integer := greatest(1, coalesce(p_seconds, 1));
begin
  if v_secs < 60 then
    return '⏳ Cool your jets, speed racer. Try again in ' || v_secs || ' sec.';
  elsif v_secs < 3600 then
    return '⏳ Cool your jets, speed racer. Try again in ' || ceil(v_secs / 60.0)::integer || ' min.';
  else
    return '⏳ Cool your jets, speed racer. Try again in ' || ceil(v_secs / 3600.0)::integer || ' hr.';
  end if;
end;
$$;

create or replace function public.check_and_record_rate_limit(
  p_user_id uuid,
  p_action text,
  p_ip_hash text default null,
  p_record boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_established boolean;
  v_ip text := nullif(btrim(coalesce(p_ip_hash, '')), '');
  v_now timestamptz := now();
  v_rule record;
  v_cnt integer;
  v_oldest timestamptz;
  v_retry integer;
begin
  if p_user_id is null or p_action not in ('upload', 'upload_sign', 'comment', 'vote', 'report') then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;

  v_established := public.is_established_account(p_user_id);

  for v_rule in
    select win_secs, lim, lbl
    from (
      values
        ('upload',      false,  3600,   5, '1h'),
        ('upload',      false, 86400,  20, '24h'),
        ('upload',       true,  3600,  15, '1h'),
        ('upload',       true, 86400,  60, '24h'),
        ('upload_sign', false,  3600,   5, '1h'),
        ('upload_sign', false, 86400,  20, '24h'),
        ('upload_sign',  true,  3600,  15, '1h'),
        ('upload_sign',  true, 86400,  60, '24h'),
        ('comment',     false,    10,   1, '10s'),
        ('comment',     false, 86400,  60, '24h'),
        ('comment',      true,     5,   1, '5s'),
        ('comment',      true, 86400, 120, '24h'),
        ('vote',        false,  3600, 120, '1h'),
        ('vote',         true,  3600, 300, '1h'),
        ('report',      false,     3,   1, '3s'),
        ('report',      false, 86400,  20, '24h'),
        ('report',       true,     3,   1, '3s'),
        ('report',       true, 86400,  40, '24h')
    ) as rules(act, est, win_secs, lim, lbl)
    where rules.act = p_action
      and rules.est = v_established
    order by win_secs asc
  loop
    select count(*)::integer, min(e.created_at)
    into v_cnt, v_oldest
    from public.rate_limit_events e
    where e.action = p_action
      and e.user_id = p_user_id
      and e.created_at > v_now - make_interval(secs => v_rule.win_secs);

    if v_cnt >= v_rule.lim then
      v_retry := greatest(
        1,
        ceil(extract(epoch from ((v_oldest + make_interval(secs => v_rule.win_secs)) - v_now)))::integer
      );
      return jsonb_build_object(
        'ok', false,
        'error', 'rate_limited',
        'action', p_action,
        'scope', 'user',
        'window', v_rule.lbl,
        'limit', v_rule.lim,
        'retry_after_seconds', v_retry,
        'message', public.format_rate_limit_message(v_retry)
      );
    end if;

    if v_ip is not null then
      select count(*)::integer, min(e.created_at)
      into v_cnt, v_oldest
      from public.rate_limit_events e
      where e.action = p_action
        and e.ip_hash = v_ip
        and e.created_at > v_now - make_interval(secs => v_rule.win_secs);

      if v_cnt >= v_rule.lim then
        v_retry := greatest(
          1,
          ceil(extract(epoch from ((v_oldest + make_interval(secs => v_rule.win_secs)) - v_now)))::integer
        );
        return jsonb_build_object(
          'ok', false,
          'error', 'rate_limited',
          'action', p_action,
          'scope', 'ip',
          'window', v_rule.lbl,
          'limit', v_rule.lim,
          'retry_after_seconds', v_retry,
          'message', public.format_rate_limit_message(v_retry)
        );
      end if;
    end if;
  end loop;

  if p_record then
    insert into public.rate_limit_events (action, user_id, ip_hash)
    values (p_action, p_user_id, v_ip);
  end if;

  return jsonb_build_object(
    'ok', true,
    'tier', case when v_established then 'linked' else 'standard' end
  );
end;
$$;

revoke all on function public.check_and_record_rate_limit(uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.check_and_record_rate_limit(uuid, text, text, boolean) to service_role;

-- Update increment_meme_score to enforce per-user and per-IP vote rate limits.
create or replace function public.increment_meme_score(row_id uuid, delta integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rl jsonb;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  insert into public.profiles (id)
  values (v_uid)
  on conflict (id) do nothing;

  if public.is_suspended(v_uid) then
    raise exception 'account_suspended' using errcode = '42501';
  end if;

  if delta not in (-2, -1, 1, 2) then
    raise exception 'invalid vote delta: %', delta using errcode = '22023';
  end if;

  v_rl := public.check_and_record_rate_limit(v_uid, 'vote', public.request_ip_hash(), true);
  if not coalesce((v_rl->>'ok')::boolean, false) then
    raise exception 'rate_limited:%', coalesce((v_rl->>'retry_after_seconds')::integer, 60)
      using errcode = 'P0001';
  end if;

  update public.memes
  set score = greatest(0, coalesce(score, 0) + delta)
  where id = row_id
    and status = 'approved';
end;
$$;

revoke all on function public.increment_meme_score(uuid, integer) from public, anon;
grant execute on function public.increment_meme_score(uuid, integer) to authenticated, service_role;

-- Update report_item to use shared per-user and per-IP rate limiting without penalizing duplicates.
create or replace function public.report_item(
  p_meme_id uuid default null,
  p_comment_id uuid default null,
  p_reason text default 'other',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := lower(coalesce(p_reason, 'other'));
  v_note text := nullif(left(btrim(coalesce(p_note, '')), 300), '');
  v_inserted bigint;
  v_reporters integer;
  v_hidden boolean := false;
  v_owner uuid;
  v_status text;
  v_rl jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'sign_in_required');
  end if;
  if (p_meme_id is null) = (p_comment_id is null) then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;
  if v_reason not in ('sexual', 'violence', 'hate', 'child', 'spam', 'copyright', 'other') then
    return jsonb_build_object('ok', false, 'error', 'bad_reason');
  end if;
  if exists (select 1 from public.profiles where id = v_uid and suspended_until > now()) then
    return jsonb_build_object('ok', false, 'error', 'suspended');
  end if;

  if p_meme_id is not null then
    select status, user_id into v_status, v_owner from public.memes where id = p_meme_id;
    if v_status is distinct from 'approved' then
      return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
  else
    select status, user_id into v_status, v_owner from public.comments where id = p_comment_id;
    if v_status is distinct from 'visible' then
      return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
  end if;

  if exists (
    select 1
    from public.reports r
    where r.reporter_id = v_uid
      and (
        (p_meme_id is not null and r.meme_id = p_meme_id)
        or (p_comment_id is not null and r.comment_id = p_comment_id)
      )
  ) then
    return jsonb_build_object('ok', true, 'already_reported', true, 'hidden', false);
  end if;

  v_rl := public.check_and_record_rate_limit(v_uid, 'report', public.request_ip_hash(), true);
  if not coalesce((v_rl->>'ok')::boolean, false) then
    return v_rl;
  end if;

  insert into public.reports (meme_id, comment_id, reporter_id, reason, note)
  values (p_meme_id, p_comment_id, v_uid, v_reason, v_note)
  on conflict do nothing
  returning id into v_inserted;

  if v_inserted is null then
    return jsonb_build_object('ok', true, 'already_reported', true, 'hidden', false);
  end if;

  select count(distinct reporter_id) into v_reporters
  from public.reports
  where status = 'open'
    and (meme_id = p_meme_id or comment_id = p_comment_id);

  if v_reporters >= 3 or v_reason = 'child' then
    if p_meme_id is not null then
      update public.memes
      set status = 'pending',
          moderation = coalesce(moderation, '{}'::jsonb)
            || jsonb_build_object('auto_hidden', jsonb_build_object('at', now(), 'reporters', v_reporters, 'trigger', v_reason))
      where id = p_meme_id and status = 'approved';
    else
      update public.comments set status = 'pending' where id = p_comment_id and status = 'visible';
    end if;
    v_hidden := found;
    if v_hidden then
      insert into public.moderation_actions (moderator_id, action, meme_id, comment_id, target_user_id, reason, note)
      values (null, 'auto_hide', p_meme_id, p_comment_id, v_owner, v_reason, v_reporters || ' distinct reporter(s)');
      begin
        perform realtime.send(
          jsonb_build_object('meme_id', p_meme_id, 'comment_id', p_comment_id),
          'hidden', 'moderation', false
        );
      exception when others then
        null; -- a broadcast failure must never undo the hide
      end;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'already_reported', false, 'hidden', v_hidden);
end;
$$;

revoke all on function public.report_item(uuid, uuid, text, text) from public, anon;
grant execute on function public.report_item(uuid, uuid, text, text) to authenticated;
