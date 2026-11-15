-- Phase 33 task 33.11: High-priority takedown requests (copyright / privacy / photo-of-me).

create table if not exists public.takedown_requests (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null,
  meme_id uuid references public.memes (id) on delete set null,
  kind text not null check (kind in ('copyright', 'photo_of_me', 'privacy', 'other')),
  target_url text not null check (char_length(target_url) between 1 and 500),
  requester_email text check (requester_email is null or char_length(requester_email) <= 200),
  details text not null check (char_length(details) between 5 and 1000),
  priority integer not null default 95,
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists takedown_requests_open_idx on public.takedown_requests (status, priority desc, created_at desc);

alter table public.takedown_requests enable row level security;
revoke insert, update, delete on table public.takedown_requests from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'takedown_requests' and policyname = 'Moderators can read takedown requests'
  ) then
    create policy "Moderators can read takedown requests"
      on public.takedown_requests for select
      using (public.is_moderator());
  end if;
end $$;

create or replace function public.submit_takedown_request(
  p_target_url text,
  p_kind text default 'copyright',
  p_requester_email text default null,
  p_details text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_kind text := lower(btrim(coalesce(p_kind, 'copyright')));
  v_url text := left(btrim(coalesce(p_target_url, '')), 500);
  v_email text := nullif(left(btrim(coalesce(p_requester_email, '')), 200), '');
  v_details text := left(btrim(coalesce(p_details, '')), 1000);
  v_uuid_match text[];
  v_meme_id uuid := null;
  v_takedown_id uuid;
  v_rl jsonb;
  v_report_reason text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'sign_in_required');
  end if;

  if v_kind not in ('copyright', 'photo_of_me', 'privacy', 'other') then
    return jsonb_build_object('ok', false, 'error', 'invalid_kind');
  end if;

  if char_length(v_url) < 1 or char_length(v_details) < 5 then
    return jsonb_build_object('ok', false, 'error', 'missing_fields');
  end if;

  select public.check_and_record_rate_limit(v_uid, 'report', null, true) into v_rl;
  if coalesce((v_rl ->> 'ok')::boolean, false) is false then
    return v_rl;
  end if;

  v_uuid_match := regexp_match(
    v_url,
    '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})'
  );
  if v_uuid_match is not null then
    select m.id into v_meme_id from public.memes m where m.id = v_uuid_match[1]::uuid;
  end if;

  insert into public.takedown_requests (
    reporter_id,
    meme_id,
    kind,
    target_url,
    requester_email,
    details,
    priority,
    status
  )
  values (
    v_uid,
    v_meme_id,
    v_kind,
    v_url,
    v_email,
    v_details,
    95,
    'open'
  )
  returning id into v_takedown_id;

  if v_meme_id is not null then
    v_report_reason := case when v_kind = 'copyright' then 'copyright' else 'other' end;
    insert into public.reports (meme_id, reporter_id, reason, note)
    values (
      v_meme_id,
      v_uid,
      v_report_reason,
      left('[HIGH-PRIORITY TAKEDOWN: ' || v_kind || '] ' || v_details, 300)
    )
    on conflict do nothing;

    insert into public.moderation_actions (
      moderator_id,
      action,
      meme_id,
      reason,
      note
    )
    values (
      null,
      'takedown_request',
      v_meme_id,
      v_kind,
      left(v_url || ' — ' || v_details, 300)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', v_takedown_id,
    'meme_id', v_meme_id,
    'priority', 95
  );
end;
$$;

revoke all on function public.submit_takedown_request(text, text, text, text) from public;
grant execute on function public.submit_takedown_request(text, text, text, text) to authenticated;
