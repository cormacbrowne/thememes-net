-- ============================================================================
-- Migration 20261115000005 — Phase 33 task 33.5
-- Real reporting, auto-hide and a moderator queue.
--
--   1. profiles (id, role, suspended_until, strikes): minimal, so moderators can be named.
--      Task 33.6 adds usernames etc. Nobody can write it through the public API; the owner
--      makes someone a moderator with:
--        insert into public.profiles (id, role) values ('<auth user id>', 'moderator')
--        on conflict (id) do update set role = excluded.role;
--   2. is_moderator(): used by RLS and every moderator RPC.
--   3. comments.status (visible | pending | removed); the public only sees `visible`.
--   4. reports: one per reporter per item, inserted ONLY through report_item(), which
--      rate-limits (20/day, 1 per 3 s), refuses suspended accounts and auto-hides an item at
--      3 distinct reporters (or 1 report with reason 'child') by flipping it to `pending`.
--   5. moderation_actions: log of every auto-hide and moderator decision.
--   6. upload_rejections: publish-meme logs each refused upload (for the digest and 33.7).
--   7. mod_queue() / mod_apply_decision(): the /admin/moderation queue. mod_queue refuses
--      non-moderators (42501); mod_apply_decision is service-role only (called by the
--      `moderate` Edge Function, which also moves removed files out of the public bucket).
--   8. meme_public_state(id): 'approved' | 'gone' | 'missing' for api/meme-og.js (HTTP 410).
--   9. Daily digest at 08:00 UTC (pg_cron) → Discord webhook (pg_net), URL read from Vault
--      secret `moderation_digest_webhook_url`. Every digest is also stored in
--      moderation_digests, so nothing is lost if the webhook is not set.
--  10. Realtime broadcast on topic `moderation` (event `hidden`) so open feeds drop a hidden
--      item within seconds.
-- Safe to run more than once.
-- ============================================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 1. profiles -------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  suspended_until timestamptz,
  strikes integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists suspended_until timestamptz;
alter table public.profiles add column if not exists strikes integer not null default 0;
alter table public.profiles enable row level security;
revoke insert, update, delete on table public.profiles from anon, authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() is not null and id = auth.uid());

-- 2. is_moderator() -------------------------------------------------------------------
create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('moderator', 'admin')
  );
$$;
revoke all on function public.is_moderator() from public;
grant execute on function public.is_moderator() to anon, authenticated, service_role;

-- Moderators can see pending/removed memes (for the queue).
drop policy if exists "Approved memes are public; authors see their own" on public.memes;
drop policy if exists "Approved memes are public; authors and moderators see more" on public.memes;
create policy "Approved memes are public; authors and moderators see more"
  on public.memes for select
  using (
    status = 'approved'
    or (auth.uid() is not null and user_id = auth.uid())
    or public.is_moderator()
  );

-- 3. comments.status --------------------------------------------------------------------
alter table public.comments add column if not exists status text not null default 'visible';
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.comments'::regclass and conname = 'comments_status_check'
  ) then
    alter table public.comments
      add constraint comments_status_check check (status in ('visible', 'pending', 'removed'));
  end if;
end
$$;
drop policy if exists "Comments are viewable by everyone" on public.comments;
drop policy if exists "Visible comments are public; authors and moderators see more" on public.comments;
create policy "Visible comments are public; authors and moderators see more"
  on public.comments for select
  using (
    status = 'visible'
    or (auth.uid() is not null and user_id = auth.uid())
    or public.is_moderator()
  );

-- 4. reports ----------------------------------------------------------------------------
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  meme_id uuid references public.memes (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  reporter_id uuid not null,
  reason text not null check (reason in ('sexual', 'violence', 'hate', 'child', 'spam', 'copyright', 'other')),
  note text check (note is null or char_length(note) <= 300),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint reports_one_target check ((meme_id is null) <> (comment_id is null))
);
create unique index if not exists reports_one_per_reporter_meme on public.reports (reporter_id, meme_id) where meme_id is not null;
create unique index if not exists reports_one_per_reporter_comment on public.reports (reporter_id, comment_id) where comment_id is not null;
create index if not exists reports_open_idx on public.reports (status, created_at desc);
create index if not exists reports_reporter_time_idx on public.reports (reporter_id, created_at desc);
alter table public.reports enable row level security;
revoke insert, update, delete on table public.reports from anon, authenticated;
drop policy if exists "Moderators can read reports" on public.reports;
create policy "Moderators can read reports" on public.reports for select using (public.is_moderator());

-- 5. moderation_actions -----------------------------------------------------------------
create table if not exists public.moderation_actions (
  id bigint generated always as identity primary key,
  moderator_id uuid,                 -- null = automatic (auto-hide)
  action text not null,              -- auto_hide | approve | remove | remove_ban_hash | remove_suspend
  meme_id uuid,
  comment_id uuid,
  target_user_id uuid,
  reason text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists moderation_actions_time_idx on public.moderation_actions (created_at desc);
alter table public.moderation_actions enable row level security;
revoke insert, update, delete on table public.moderation_actions from anon, authenticated;
drop policy if exists "Moderators can read the moderation log" on public.moderation_actions;
create policy "Moderators can read the moderation log" on public.moderation_actions for select using (public.is_moderator());

-- 6. upload_rejections (written by publish-meme with the service role) ------------------
create table if not exists public.upload_rejections (
  id bigint generated always as identity primary key,
  user_id uuid,
  kind text not null,       -- banned_hash | image | text
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists upload_rejections_time_idx on public.upload_rejections (created_at desc);
alter table public.upload_rejections enable row level security;
revoke all on table public.upload_rejections from anon, authenticated;

-- 7. Severity of a report reason (queue order) -------------------------------------------
create or replace function public.report_reason_weight(p_reason text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_reason
    when 'child' then 100
    when 'sexual' then 80
    when 'violence' then 70
    when 'hate' then 60
    when 'spam' then 30
    when 'copyright' then 25
    else 10
  end;
$$;

-- 8. report_item() ------------------------------------------------------------------------
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

  -- Rate limits: 20 reports per rolling 24 h, and not more than one every 3 seconds.
  if (select count(*) from public.reports where reporter_id = v_uid and created_at > now() - interval '24 hours') >= 20
     or exists (select 1 from public.reports where reporter_id = v_uid and created_at > now() - interval '3 seconds') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
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

-- 9. mod_queue() --------------------------------------------------------------------------
create or replace function public.mod_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  if not public.is_moderator() then
    raise exception 'moderators only' using errcode = '42501';
  end if;

  with meme_reports as (
    select r.meme_id as id,
           count(*) filter (where r.status = 'open') as open_reports,
           max(public.report_reason_weight(r.reason)) filter (where r.status = 'open') as top_weight,
           bool_or(r.reason = 'child' and r.status = 'open') as child_flag
    from public.reports r where r.meme_id is not null
    group by r.meme_id
  ),
  meme_reason_counts as (
    select meme_id as id, jsonb_object_agg(reason, n) as reasons
    from (select meme_id, reason, count(*) n from public.reports where meme_id is not null and status = 'open' group by 1, 2) x
    group by meme_id
  ),
  meme_notes as (
    select meme_id as id, jsonb_agg(note order by created_at desc) as notes
    from (
      select meme_id, note, created_at,
             row_number() over (partition by meme_id order by created_at desc) rn
      from public.reports where meme_id is not null and status = 'open' and note is not null
    ) x where rn <= 3
    group by meme_id
  ),
  comment_reason_counts as (
    select comment_id as id, jsonb_object_agg(reason, n) as reasons,
           sum(n) as open_reports, max(public.report_reason_weight(reason)) as top_weight,
           bool_or(reason = 'child') as child_flag
    from (select comment_id, reason, count(*) n from public.reports where comment_id is not null and status = 'open' group by 1, 2) x
    group by comment_id
  ),
  comment_notes as (
    select comment_id as id, jsonb_agg(note order by created_at desc) as notes
    from (
      select comment_id, note, created_at,
             row_number() over (partition by comment_id order by created_at desc) rn
      from public.reports where comment_id is not null and status = 'open' and note is not null
    ) x where rn <= 3
    group by comment_id
  ),
  items as (
    select jsonb_build_object(
             'kind', 'meme', 'id', m.id, 'title', m.title, 'image_url', m.image_url,
             'poster_url', m.poster_url, 'media_type', m.media_type, 'author_name', m.author_name,
             'user_id', m.user_id, 'status', m.status, 'created_at', m.created_at,
             'open_reports', coalesce(mr.open_reports, 0), 'reasons', coalesce(rc.reasons, '{}'::jsonb),
             'notes', coalesce(mn.notes, '[]'::jsonb), 'child_flag', coalesce(mr.child_flag, false),
             'auto_hidden', m.moderation ? 'auto_hidden',
             'held_by', case
               when m.moderation ? 'auto_hidden' then 'reports'
               when m.status = 'pending' then coalesce(m.moderation -> 'image' ->> 'reason', m.moderation -> 'text' ->> 'reason', 'upload_check')
               else 'reports' end,
             'severity', greatest(coalesce(mr.top_weight, 0), case when m.status = 'pending' then 40 else 0 end)
                         + least(coalesce(mr.open_reports, 0), 10) * 2
           ) as item,
           greatest(coalesce(mr.top_weight, 0), case when m.status = 'pending' then 40 else 0 end)
             + least(coalesce(mr.open_reports, 0), 10) * 2 as severity,
           m.created_at
    from public.memes m
    left join meme_reports mr on mr.id = m.id
    left join meme_reason_counts rc on rc.id = m.id
    left join meme_notes mn on mn.id = m.id
    where m.status = 'pending' or (m.status = 'approved' and coalesce(mr.open_reports, 0) > 0)
    union all
    select jsonb_build_object(
             'kind', 'comment', 'id', c.id, 'meme_id', c.meme_id, 'body', c.body,
             'author_name', c.author_name, 'user_id', c.user_id, 'status', c.status,
             'created_at', c.created_at, 'open_reports', coalesce(cr.open_reports, 0),
             'reasons', coalesce(cr.reasons, '{}'::jsonb), 'notes', coalesce(cn.notes, '[]'::jsonb),
             'child_flag', coalesce(cr.child_flag, false), 'auto_hidden', c.status = 'pending',
             'held_by', 'reports',
             'severity', coalesce(cr.top_weight, 0) + least(coalesce(cr.open_reports, 0), 10) * 2
           ),
           coalesce(cr.top_weight, 0) + least(coalesce(cr.open_reports, 0), 10) * 2,
           c.created_at
    from public.comments c
    left join comment_reason_counts cr on cr.id = c.id
    left join comment_notes cn on cn.id = c.id
    where c.status = 'pending' or (c.status = 'visible' and coalesce(cr.open_reports, 0) > 0)
  )
  select coalesce(jsonb_agg(item order by severity desc, created_at asc), '[]'::jsonb)
  into v_items
  from (select * from items order by severity desc, created_at asc limit 200) q;

  return v_items;
end;
$$;
revoke all on function public.mod_queue() from public, anon;
grant execute on function public.mod_queue() to authenticated, service_role;

-- 10. mod_apply_decision() — service role only (the `moderate` Edge Function) ------------
create or replace function public.mod_apply_decision(
  p_moderator uuid,
  p_meme_id uuid,
  p_comment_id uuid,
  p_decision text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_sha text;
  v_phash text;
  v_image text;
  v_poster text;
  v_base text;
  v_status text;
  v_note text := nullif(left(btrim(coalesce(p_note, '')), 300), '');
  v_top_reason text;
  v_suspended_until timestamptz;
begin
  if not exists (select 1 from public.profiles where id = p_moderator and role in ('moderator', 'admin')) then
    return jsonb_build_object('ok', false, 'error', 'not_moderator');
  end if;
  if (p_meme_id is null) = (p_comment_id is null)
     or p_decision not in ('approve', 'remove', 'remove_ban_hash', 'remove_suspend') then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;

  select reason into v_top_reason
  from public.reports
  where status = 'open' and (meme_id = p_meme_id or comment_id = p_comment_id)
  order by public.report_reason_weight(reason) desc, created_at asc
  limit 1;

  if p_meme_id is not null then
    select user_id, sha256, phash, image_url, poster_url, base_image_url, status
      into v_owner, v_sha, v_phash, v_image, v_poster, v_base, v_status
    from public.memes where id = p_meme_id for update;
    if v_status is null then
      return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
    if p_decision = 'approve' then
      update public.memes set status = 'approved', removed_reason = null where id = p_meme_id;
    else
      update public.memes
      set status = 'removed',
          removed_reason = coalesce(v_note, v_top_reason, 'moderator')
      where id = p_meme_id;
    end if;
  else
    select user_id, status into v_owner, v_status from public.comments where id = p_comment_id for update;
    if v_status is null then
      return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
    update public.comments
    set status = case when p_decision = 'approve' then 'visible' else 'removed' end
    where id = p_comment_id;
  end if;

  update public.reports
  set status = case when p_decision = 'approve' then 'dismissed' else 'actioned' end
  where status = 'open' and (meme_id = p_meme_id or comment_id = p_comment_id);

  if p_decision = 'remove_ban_hash' and p_meme_id is not null and (v_sha is not null or v_phash is not null) then
    if v_sha is not null and exists (select 1 from public.banned_hashes where sha256 = v_sha) then
      null;
    else
      insert into public.banned_hashes (sha256, phash, reason, source, meme_id)
      values (v_sha, case when v_phash ~ '^[0-9a-f]{16}$' then v_phash end,
              'moderator:' || coalesce(v_top_reason, 'removed'), 'moderator', p_meme_id);
    end if;
  end if;

  if p_decision in ('remove', 'remove_ban_hash', 'remove_suspend') and v_owner is not null then
    insert into public.profiles (id, strikes) values (v_owner, 1)
    on conflict (id) do update set strikes = public.profiles.strikes + 1;
  end if;

  if p_decision = 'remove_suspend' and v_owner is not null then
    v_suspended_until := now() + interval '7 days';
    update public.profiles set suspended_until = greatest(coalesce(suspended_until, now()), v_suspended_until)
    where id = v_owner;
  end if;

  if v_top_reason = 'child' and p_decision <> 'approve' then
    insert into public.moderation_incidents (kind, user_id, sha256, phash, provider, categories)
    values ('reported_child_' || case when p_meme_id is not null then 'meme' else 'comment' end,
            v_owner, v_sha, v_phash, 'user_report',
            jsonb_build_object('meme_id', p_meme_id, 'comment_id', p_comment_id));
  end if;

  insert into public.moderation_actions (moderator_id, action, meme_id, comment_id, target_user_id, reason, note)
  values (p_moderator, p_decision, p_meme_id, p_comment_id, v_owner, v_top_reason, v_note);

  if p_decision <> 'approve' then
    begin
      perform realtime.send(
        jsonb_build_object('meme_id', p_meme_id, 'comment_id', p_comment_id),
        'hidden', 'moderation', false
      );
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object(
    'ok', true,
    'decision', p_decision,
    'owner', v_owner,
    'image_url', v_image,
    'poster_url', v_poster,
    'base_image_url', v_base,
    'child', coalesce(v_top_reason = 'child', false),
    'suspended_until', v_suspended_until
  );
end;
$$;
revoke all on function public.mod_apply_decision(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.mod_apply_decision(uuid, uuid, uuid, text, text) to service_role;

-- 11. meme_public_state() for /m/<id> (410 for removed memes) -----------------------------
-- Reveals only whether a meme is live, gone (removed/rejected) or missing (pending = missing,
-- so a held upload is not disclosed).
create or replace function public.meme_public_state(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select case when status = 'approved' then 'approved'
                 when status in ('removed', 'rejected') then 'gone'
                 else 'missing' end
     from public.memes where id = p_id),
    'missing');
$$;
revoke all on function public.meme_public_state(uuid) from public;
grant execute on function public.meme_public_state(uuid) to anon, authenticated, service_role;

-- 12. Daily digest -------------------------------------------------------------------------
create table if not exists public.moderation_digests (
  id bigint generated always as identity primary key,
  counts jsonb not null,
  sent boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.moderation_digests enable row level security;
revoke all on table public.moderation_digests from anon, authenticated;

create or replace function public.moderation_digest_send()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_counts jsonb;
  v_url text;
  v_text text;
  v_sent boolean := false;
begin
  select jsonb_build_object(
    'uploads_24h', (select count(*) from public.memes where created_at > now() - interval '24 hours'),
    'approved_24h', (select count(*) from public.memes where created_at > now() - interval '24 hours' and status = 'approved'),
    'held_pending_now', (select count(*) from public.memes where status = 'pending'),
    'auto_rejections_24h', (select count(*) from public.upload_rejections where created_at > now() - interval '24 hours'),
    'reports_24h', (select count(*) from public.reports where created_at > now() - interval '24 hours'),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'auto_hidden_24h', (select count(*) from public.moderation_actions where action = 'auto_hide' and created_at > now() - interval '24 hours'),
    'moderator_actions_24h', (select count(*) from public.moderation_actions where moderator_id is not null and created_at > now() - interval '24 hours'),
    'open_incidents', (select count(*) from public.moderation_incidents where status = 'open')
  ) into v_counts;

  v_text := format(
    E'**THE MEMES.net — daily moderation digest**\nUploads (24 h): %s (approved %s)\nAuto-rejected uploads (24 h): %s\nHeld for review now: %s\nReports (24 h): %s · open: %s\nAuto-hidden (24 h): %s\nModerator actions (24 h): %s%s\nQueue: https://thememes.net/admin/moderation',
    v_counts ->> 'uploads_24h', v_counts ->> 'approved_24h', v_counts ->> 'auto_rejections_24h',
    v_counts ->> 'held_pending_now', v_counts ->> 'reports_24h', v_counts ->> 'open_reports',
    v_counts ->> 'auto_hidden_24h', v_counts ->> 'moderator_actions_24h',
    case when (v_counts ->> 'open_incidents')::int > 0
         then E'\n⚠️ Open child-safety incidents: ' || (v_counts ->> 'open_incidents') || ' (follow the legal reporting procedure)'
         else '' end
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

  insert into public.moderation_digests (counts, sent) values (v_counts, v_sent);
  return v_counts || jsonb_build_object('sent', v_sent);
end;
$$;
revoke all on function public.moderation_digest_send() from public, anon, authenticated;
grant execute on function public.moderation_digest_send() to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'moderation-daily-digest') then
    perform cron.unschedule('moderation-daily-digest');
  end if;
  perform cron.schedule('moderation-daily-digest', '0 8 * * *', 'select public.moderation_digest_send();');
end
$$;
