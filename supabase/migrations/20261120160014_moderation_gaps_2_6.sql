-- Phase 2.6: Moderation & safety gaps
-- Additive only (no destructive statements).

create table if not exists public.moderation_settings (
  id smallint primary key default 1 check (id = 1),
  auto_hide_reports smallint not null default 3 check (auto_hide_reports between 1 and 25),
  extra_blocked_terms text[] not null default '{}'::text[],
  image_moderation_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid null
);

insert into public.moderation_settings (id, auto_hide_reports, extra_blocked_terms, image_moderation_enabled)
values (1, 3, '{}'::text[], false)
on conflict (id) do nothing;

alter table public.moderation_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'moderation_settings' and policyname = 'moderation_settings_mod_read'
  ) then
    create policy moderation_settings_mod_read on public.moderation_settings
      for select to authenticated
      using (public.is_moderator());
  end if;
end $$;

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('battle_entry', 'profile')),
  battle_entry_id uuid null references public.caption_battle_entries(id),
  reported_handle text null,
  reporter_id uuid not null,
  reason text not null check (reason in ('sexual', 'violence', 'hate', 'child', 'spam', 'copyright', 'other')),
  note text null check (note is null or char_length(note) <= 300),
  status text not null default 'open' check (status in ('open', 'actioned', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint content_reports_one_target check (
    (target_kind = 'battle_entry' and battle_entry_id is not null and reported_handle is null)
    or (target_kind = 'profile' and reported_handle is not null and battle_entry_id is null)
  )
);

create unique index if not exists content_reports_one_entry_per_reporter
  on public.content_reports (reporter_id, battle_entry_id)
  where battle_entry_id is not null;

create unique index if not exists content_reports_one_profile_per_reporter
  on public.content_reports (reporter_id, lower(reported_handle))
  where reported_handle is not null;

create index if not exists content_reports_open_idx
  on public.content_reports (status, created_at desc);

alter table public.content_reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content_reports' and policyname = 'content_reports_mod_read'
  ) then
    create policy content_reports_mod_read on public.content_reports
      for select to authenticated
      using (public.is_moderator());
  end if;
end $$;

alter table public.moderation_actions
  add column if not exists battle_entry_id uuid,
  add column if not exists reported_handle text;

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
  v_threshold integer := 3;
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

  select coalesce((select auto_hide_reports from public.moderation_settings where id = 1), 3)
  into v_threshold;

  select count(distinct reporter_id) into v_reporters
  from public.reports
  where status = 'open'
    and (meme_id = p_meme_id or comment_id = p_comment_id);

  if v_reporters >= greatest(1, v_threshold) or v_reason = 'child' then
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
        null;
      end;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'already_reported', false, 'hidden', v_hidden);
end;
$$;
revoke all on function public.report_item(uuid, uuid, text, text) from public;
grant execute on function public.report_item(uuid, uuid, text, text) to authenticated, service_role;

create or replace function public.report_content(
  p_target_kind text,
  p_meme_id uuid default null,
  p_comment_id uuid default null,
  p_battle_entry_id uuid default null,
  p_reported_handle text default null,
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
  v_kind text := lower(coalesce(p_target_kind, ''));
  v_reason text := lower(coalesce(p_reason, 'other'));
  v_note text := nullif(left(btrim(coalesce(p_note, '')), 300), '');
  v_handle text := regexp_replace(btrim(coalesce(p_reported_handle, '')), '^@+', '');
  v_threshold integer := 3;
  v_owner uuid;
  v_status text;
  v_rl jsonb;
  v_inserted uuid;
  v_reporters integer := 0;
  v_hidden boolean := false;
begin
  if v_kind in ('meme', 'comment') then
    return public.report_item(p_meme_id, p_comment_id, v_reason, p_note);
  end if;

  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'sign_in_required');
  end if;
  if v_kind not in ('battle_entry', 'profile') then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;
  if v_reason not in ('sexual', 'violence', 'hate', 'child', 'spam', 'copyright', 'other') then
    return jsonb_build_object('ok', false, 'error', 'bad_reason');
  end if;
  if exists (select 1 from public.profiles where id = v_uid and suspended_until > now()) then
    return jsonb_build_object('ok', false, 'error', 'suspended');
  end if;

  if v_kind = 'battle_entry' then
    if p_battle_entry_id is null then
      return jsonb_build_object('ok', false, 'error', 'bad_request');
    end if;
    select status, user_id into v_status, v_owner
    from public.caption_battle_entries
    where id = p_battle_entry_id;
    if v_status not in ('approved', 'pending') then
      return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
    if exists (
      select 1 from public.content_reports
      where reporter_id = v_uid and battle_entry_id = p_battle_entry_id
    ) then
      return jsonb_build_object('ok', true, 'already_reported', true, 'hidden', false);
    end if;
  else
    if v_handle !~ '^[A-Za-z0-9_.-]{2,32}$' then
      return jsonb_build_object('ok', false, 'error', 'bad_request');
    end if;
    if exists (
      select 1 from public.content_reports
      where reporter_id = v_uid and lower(reported_handle) = lower(v_handle)
    ) then
      return jsonb_build_object('ok', true, 'already_reported', true, 'hidden', false);
    end if;
    select id into v_owner from public.profiles where lower(username) = lower(v_handle) limit 1;
  end if;

  v_rl := public.check_and_record_rate_limit(v_uid, 'report', public.request_ip_hash(), true);
  if not coalesce((v_rl->>'ok')::boolean, false) then
    return v_rl;
  end if;

  insert into public.content_reports (
    target_kind, battle_entry_id, reported_handle, reporter_id, reason, note
  )
  values (
    v_kind,
    case when v_kind = 'battle_entry' then p_battle_entry_id else null end,
    case when v_kind = 'profile' then v_handle else null end,
    v_uid,
    v_reason,
    v_note
  )
  on conflict do nothing
  returning id into v_inserted;

  if v_inserted is null then
    return jsonb_build_object('ok', true, 'already_reported', true, 'hidden', false);
  end if;

  select coalesce((select auto_hide_reports from public.moderation_settings where id = 1), 3)
  into v_threshold;

  if v_kind = 'battle_entry' then
    select count(distinct reporter_id) into v_reporters
    from public.content_reports
    where status = 'open' and battle_entry_id = p_battle_entry_id;

    if v_reporters >= greatest(1, v_threshold) or v_reason = 'child' then
      update public.caption_battle_entries
      set status = 'pending',
          updated_at = now()
      where id = p_battle_entry_id and status = 'approved';
      v_hidden := found;
      if v_hidden then
        insert into public.moderation_actions (
          moderator_id, action, battle_entry_id, target_user_id, reason, note
        )
        values (
          null, 'auto_hide', p_battle_entry_id, v_owner, v_reason, v_reporters || ' distinct reporter(s)'
        );
      end if;
    end if;
  else
    select count(distinct reporter_id) into v_reporters
    from public.content_reports
    where status = 'open' and lower(reported_handle) = lower(v_handle);
  end if;

  return jsonb_build_object(
    'ok', true,
    'already_reported', false,
    'hidden', v_hidden,
    'distinct_reporters', v_reporters
  );
end;
$$;
revoke all on function public.report_content(text, uuid, uuid, uuid, text, text, text) from public;
grant execute on function public.report_content(text, uuid, uuid, uuid, text, text, text) to authenticated, service_role;

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
  entry_reports as (
    select cr.battle_entry_id as id,
           count(*) as open_reports,
           max(public.report_reason_weight(cr.reason)) as top_weight,
           bool_or(cr.reason = 'child') as child_flag
    from public.content_reports cr
    where cr.target_kind = 'battle_entry' and cr.status = 'open' and cr.battle_entry_id is not null
    group by cr.battle_entry_id
  ),
  entry_reason_counts as (
    select battle_entry_id as id, jsonb_object_agg(reason, n) as reasons
    from (
      select battle_entry_id, reason, count(*) n
      from public.content_reports
      where target_kind = 'battle_entry' and status = 'open' and battle_entry_id is not null
      group by 1, 2
    ) x
    group by battle_entry_id
  ),
  entry_notes as (
    select battle_entry_id as id, jsonb_agg(note order by created_at desc) as notes
    from (
      select battle_entry_id, note, created_at,
             row_number() over (partition by battle_entry_id order by created_at desc) rn
      from public.content_reports
      where target_kind = 'battle_entry' and status = 'open' and battle_entry_id is not null and note is not null
    ) x where rn <= 3
    group by battle_entry_id
  ),
  profile_reports as (
    select lower(cr.reported_handle) as handle_key,
           min(cr.reported_handle) as display_handle,
           count(*) as open_reports,
           max(public.report_reason_weight(cr.reason)) as top_weight,
           bool_or(cr.reason = 'child') as child_flag,
           min(cr.created_at) as created_at
    from public.content_reports cr
    where cr.target_kind = 'profile' and cr.status = 'open' and cr.reported_handle is not null
    group by 1
  ),
  profile_reason_counts as (
    select handle_key, jsonb_object_agg(reason, n) as reasons
    from (
      select lower(reported_handle) as handle_key, reason, count(*) n
      from public.content_reports
      where target_kind = 'profile' and status = 'open' and reported_handle is not null
      group by 1, 2
    ) x
    group by handle_key
  ),
  profile_notes as (
    select handle_key, jsonb_agg(note order by created_at desc) as notes
    from (
      select lower(reported_handle) as handle_key, note, created_at,
             row_number() over (partition by lower(reported_handle) order by created_at desc) rn
      from public.content_reports
      where target_kind = 'profile' and status = 'open' and reported_handle is not null and note is not null
    ) x where rn <= 3
    group by handle_key
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
    union all
    select jsonb_build_object(
             'kind', 'battle_entry',
             'id', e.id,
             'battle_id', e.battle_id,
             'body', coalesce(nullif(concat_ws(' / ', nullif(e.top_text, ''), nullif(e.bottom_text, '')), ''), '(empty caption)'),
             'author_name', e.author_name,
             'user_id', e.user_id,
             'status', e.status,
             'created_at', e.created_at,
             'open_reports', coalesce(er.open_reports, 0),
             'reasons', coalesce(erc.reasons, '{}'::jsonb),
             'notes', coalesce(en.notes, '[]'::jsonb),
             'child_flag', coalesce(er.child_flag, false),
             'auto_hidden', (e.status = 'pending' and coalesce(er.open_reports, 0) > 0),
             'held_by', case when coalesce(er.open_reports, 0) > 0 then 'reports' else 'upload_check' end,
             'severity', greatest(coalesce(er.top_weight, 0), case when e.status = 'pending' then 40 else 0 end)
                         + least(coalesce(er.open_reports, 0), 10) * 2
           ),
           greatest(coalesce(er.top_weight, 0), case when e.status = 'pending' then 40 else 0 end)
             + least(coalesce(er.open_reports, 0), 10) * 2,
           e.created_at
    from public.caption_battle_entries e
    left join entry_reports er on er.id = e.id
    left join entry_reason_counts erc on erc.id = e.id
    left join entry_notes en on en.id = e.id
    where e.status = 'pending' or (e.status = 'approved' and coalesce(er.open_reports, 0) > 0)
    union all
    select jsonb_build_object(
             'kind', 'profile',
             'id', pr.display_handle,
             'author_name', pr.display_handle,
             'user_id', p.id,
             'body', coalesce(nullif(p.bio, ''), 'Reported profile @' || pr.display_handle),
             'status', 'open',
             'created_at', pr.created_at,
             'open_reports', pr.open_reports,
             'reasons', coalesce(prc.reasons, '{}'::jsonb),
             'notes', coalesce(pn.notes, '[]'::jsonb),
             'child_flag', coalesce(pr.child_flag, false),
             'auto_hidden', false,
             'held_by', 'reports',
             'severity', coalesce(pr.top_weight, 0) + least(pr.open_reports, 10) * 2
           ),
           coalesce(pr.top_weight, 0) + least(pr.open_reports, 10) * 2,
           pr.created_at
    from profile_reports pr
    left join profile_reason_counts prc on prc.handle_key = pr.handle_key
    left join profile_notes pn on pn.handle_key = pr.handle_key
    left join lateral (
      select id, bio
      from public.profiles prof
      where lower(prof.username) = pr.handle_key
      limit 1
    ) p on true
  )
  select coalesce(jsonb_agg(item order by severity desc, created_at asc), '[]'::jsonb)
  into v_items
  from (select * from items order by severity desc, created_at asc limit 200) q;

  return v_items;
end;
$$;
revoke all on function public.mod_queue() from public;
grant execute on function public.mod_queue() to authenticated, service_role;

create or replace function public.mod_apply_decision_v2(
  p_moderator uuid,
  p_meme_id uuid default null,
  p_comment_id uuid default null,
  p_battle_entry_id uuid default null,
  p_reported_handle text default null,
  p_decision text default 'approve',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_handle text := nullif(regexp_replace(btrim(coalesce(p_reported_handle, '')), '^@+', ''), '');
  v_targets integer :=
    (case when p_meme_id is not null then 1 else 0 end)
    + (case when p_comment_id is not null then 1 else 0 end)
    + (case when p_battle_entry_id is not null then 1 else 0 end)
    + (case when v_handle is not null then 1 else 0 end);
  v_owner uuid;
  v_status text;
  v_note text := nullif(left(btrim(coalesce(p_note, '')), 300), '');
  v_top_reason text;
  v_suspended_until timestamptz;
begin
  if not exists (select 1 from public.profiles where id = p_moderator and role in ('moderator', 'admin')) then
    return jsonb_build_object('ok', false, 'error', 'not_moderator');
  end if;
  if v_targets <> 1 or p_decision not in ('approve', 'remove', 'remove_ban_hash', 'remove_suspend') then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;

  if p_meme_id is not null or p_comment_id is not null then
    return public.mod_apply_decision(p_moderator, p_meme_id, p_comment_id, p_decision, p_note);
  end if;

  if p_decision = 'remove_ban_hash' then
    return jsonb_build_object('ok', false, 'error', 'bad_decision');
  end if;

  select reason into v_top_reason
  from public.content_reports
  where status = 'open'
    and (
      (p_battle_entry_id is not null and battle_entry_id = p_battle_entry_id)
      or (v_handle is not null and lower(reported_handle) = lower(v_handle))
    )
  order by public.report_reason_weight(reason) desc, created_at asc
  limit 1;

  if p_battle_entry_id is not null then
    select user_id, status into v_owner, v_status
    from public.caption_battle_entries
    where id = p_battle_entry_id
    for update;
    if v_status is null then
      return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
    update public.caption_battle_entries
    set status = case when p_decision = 'approve' then 'approved' else 'removed' end,
        updated_at = now()
    where id = p_battle_entry_id;

    update public.content_reports
    set status = case when p_decision = 'approve' then 'dismissed' else 'resolved' end
    where status = 'open' and battle_entry_id = p_battle_entry_id;
  else
    select id into v_owner
    from public.profiles
    where lower(username) = lower(v_handle)
    limit 1;

    if p_decision <> 'approve' and v_owner is not null then
      update public.profiles set bio = '' where id = v_owner;
    end if;

    update public.content_reports
    set status = case when p_decision = 'approve' then 'dismissed' else 'resolved' end
    where status = 'open' and lower(reported_handle) = lower(v_handle);
  end if;

  if p_decision in ('remove', 'remove_suspend') and v_owner is not null then
    insert into public.profiles (id, strikes) values (v_owner, 1)
    on conflict (id) do update set strikes = public.profiles.strikes + 1;
  end if;

  if p_decision = 'remove_suspend' and v_owner is not null then
    v_suspended_until := now() + interval '7 days';
    update public.profiles
    set suspended_until = greatest(coalesce(suspended_until, now()), v_suspended_until)
    where id = v_owner;
  end if;

  if v_top_reason = 'child' and p_decision <> 'approve' then
    insert into public.moderation_incidents (kind, user_id, sha256, phash, provider, categories)
    values (
      'reported_child_' || case when p_battle_entry_id is not null then 'battle_entry' else 'profile' end,
      v_owner, null, null, 'user_report',
      jsonb_build_object('battle_entry_id', p_battle_entry_id, 'reported_handle', v_handle)
    );
  end if;

  insert into public.moderation_actions (
    moderator_id, action, battle_entry_id, reported_handle, target_user_id, reason, note
  )
  values (
    p_moderator, p_decision, p_battle_entry_id, v_handle, v_owner, v_top_reason, v_note
  );

  return jsonb_build_object(
    'ok', true,
    'decision', p_decision,
    'owner', v_owner,
    'child', coalesce(v_top_reason = 'child', false),
    'suspended_until', v_suspended_until
  );
end;
$$;
revoke all on function public.mod_apply_decision_v2(uuid, uuid, uuid, uuid, text, text, text) from public;
grant execute on function public.mod_apply_decision_v2(uuid, uuid, uuid, uuid, text, text, text) to service_role;

create or replace function public.admin_get_moderation_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_row public.moderation_settings%rowtype;
begin
  if not public.is_moderator() then
    raise exception 'moderators only' using errcode = '42501';
  end if;

  select * into v_row from public.moderation_settings where id = 1;
  return jsonb_build_object(
    'ok', true,
    'auto_hide_reports', coalesce(v_row.auto_hide_reports, 3),
    'extra_blocked_terms', coalesce(v_row.extra_blocked_terms, '{}'::text[]),
    'image_moderation_enabled', coalesce(v_row.image_moderation_enabled, false),
    'updated_at', v_row.updated_at
  );
end;
$$;
revoke all on function public.admin_get_moderation_settings() from public;
grant execute on function public.admin_get_moderation_settings() to authenticated, service_role;

create or replace function public.admin_update_moderation_settings(
  p_auto_hide_reports smallint default null,
  p_extra_blocked_terms text[] default null,
  p_image_moderation_enabled boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auto smallint;
  v_terms text[];
  v_row public.moderation_settings%rowtype;
begin
  if not public.is_moderator() then
    raise exception 'moderators only' using errcode = '42501';
  end if;

  insert into public.moderation_settings (id, auto_hide_reports, extra_blocked_terms, image_moderation_enabled)
  values (1, 3, '{}'::text[], false)
  on conflict (id) do nothing;

  if p_auto_hide_reports is not null then
    v_auto := greatest(1, least(25, p_auto_hide_reports));
  end if;

  if p_extra_blocked_terms is not null then
    select coalesce(array_agg(distinct t order by t), '{}'::text[])
    into v_terms
    from (
      select left(lower(btrim(x)), 60) as t
      from unnest(p_extra_blocked_terms) as x
      where btrim(coalesce(x, '')) <> ''
      limit 200
    ) clean_terms
    where t <> '';
  end if;

  update public.moderation_settings
  set auto_hide_reports = coalesce(v_auto, auto_hide_reports),
      extra_blocked_terms = coalesce(v_terms, extra_blocked_terms),
      image_moderation_enabled = coalesce(p_image_moderation_enabled, image_moderation_enabled),
      updated_at = now(),
      updated_by = auth.uid()
  where id = 1
  returning * into v_row;

  insert into public.moderation_actions (moderator_id, action, reason, note)
  values (
    auth.uid(),
    'update_settings',
    'settings',
    'auto_hide=' || v_row.auto_hide_reports || ', extra_terms=' || coalesce(array_length(v_row.extra_blocked_terms, 1), 0) || ', img_flag=' || v_row.image_moderation_enabled
  );

  return jsonb_build_object(
    'ok', true,
    'auto_hide_reports', v_row.auto_hide_reports,
    'extra_blocked_terms', coalesce(v_row.extra_blocked_terms, '{}'::text[]),
    'image_moderation_enabled', coalesce(v_row.image_moderation_enabled, false),
    'updated_at', v_row.updated_at
  );
end;
$$;
revoke all on function public.admin_update_moderation_settings(smallint, text[], boolean) from public;
grant execute on function public.admin_update_moderation_settings(smallint, text[], boolean) to authenticated, service_role;
