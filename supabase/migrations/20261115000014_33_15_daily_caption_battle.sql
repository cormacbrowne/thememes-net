-- ============================================================================
-- Migration 20261115000014 — Phase 33 task 33.15
-- Real Daily Caption Battle:
--   1. public.caption_battle_entries: moderated captions for daily battle templates.
--   2. public.caption_battle_votes: per-user deduplicated upvotes with score sync trigger.
--   3. public.caption_battle_winners: permanent archive of daily winners + 24h crown window.
--   4. public.memes: optional is_bounty & bounty_id columns for Forge Battle submissions.
--   5. RPCs: finalize_caption_battle_day, get_daily_caption_battle, vote_caption_battle_entry,
--      get_caption_hall_of_fame, get_active_caption_kings.
-- ============================================================================

alter table public.memes
  add column if not exists is_bounty boolean not null default false,
  add column if not exists bounty_id text;

create index if not exists memes_bounty_id_idx
  on public.memes (bounty_id)
  where bounty_id is not null;

create table if not exists public.caption_battle_entries (
  id uuid default gen_random_uuid() primary key,
  battle_date date not null default (timezone('utc', now())::date),
  template_id text not null check (char_length(template_id) between 2 and 64),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  top_text text not null default '' check (char_length(top_text) <= 140),
  bottom_text text not null default '' check (char_length(bottom_text) <= 140),
  score integer not null default 0,
  meme_id uuid references public.memes(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'removed')),
  moderation jsonb,
  created_at timestamptz not null default now()
);

create index if not exists caption_battle_entries_date_score_idx
  on public.caption_battle_entries (battle_date, status, score desc, created_at asc);

create index if not exists caption_battle_entries_user_idx
  on public.caption_battle_entries (user_id, created_at desc);

alter table public.caption_battle_entries enable row level security;
revoke insert, update, delete on table public.caption_battle_entries from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'caption_battle_entries'
      and policyname = 'Approved caption battle entries are public or visible to owner/mods'
  ) then
    create policy "Approved caption battle entries are public or visible to owner/mods"
      on public.caption_battle_entries for select
      using (
        status = 'approved'
        or user_id = auth.uid()
        or public.is_moderator()
      );
  end if;
end
$$;

create table if not exists public.caption_battle_votes (
  id uuid default gen_random_uuid() primary key,
  entry_id uuid not null references public.caption_battle_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  direction integer not null default 1 check (direction in (0, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint caption_battle_votes_unique unique (user_id, entry_id)
);

create index if not exists caption_battle_votes_entry_idx
  on public.caption_battle_votes (entry_id);

alter table public.caption_battle_votes enable row level security;
revoke insert, update, delete on table public.caption_battle_votes from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'caption_battle_votes'
      and policyname = 'Users can read their own caption battle votes'
  ) then
    create policy "Users can read their own caption battle votes"
      on public.caption_battle_votes for select
      using (auth.uid() = user_id);
  end if;
end
$$;

create or replace function public.sync_caption_battle_entry_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry_id uuid := coalesce(new.entry_id, old.entry_id);
begin
  if v_entry_id is null then
    return null;
  end if;

  update public.caption_battle_entries e
  set score = coalesce(
    (select sum(v.direction)::integer from public.caption_battle_votes v where v.entry_id = v_entry_id),
    0
  )
  where e.id = v_entry_id;

  return null;
end;
$$;

create or replace trigger trg_caption_battle_votes_sync
  after insert or update or delete on public.caption_battle_votes
  for each row execute function public.sync_caption_battle_entry_score();

create table if not exists public.caption_battle_winners (
  battle_date date primary key,
  entry_id uuid references public.caption_battle_entries(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  template_id text not null,
  top_text text not null default '',
  bottom_text text not null default '',
  winning_score integer not null default 0,
  crowned_until timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists caption_battle_winners_crowned_idx
  on public.caption_battle_winners (crowned_until desc);

alter table public.caption_battle_winners enable row level security;
revoke insert, update, delete on table public.caption_battle_winners from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'caption_battle_winners'
      and policyname = 'Caption battle winners archive is public'
  ) then
    create policy "Caption battle winners archive is public"
      on public.caption_battle_winners for select
      using (true);
  end if;
end
$$;

create or replace function public.finalize_caption_battle_day(p_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := timezone('utc', now())::date;
  v_top record;
begin
  if p_date is null or p_date >= v_today then
    return;
  end if;

  if exists (select 1 from public.caption_battle_winners w where w.battle_date = p_date) then
    return;
  end if;

  select
    e.id,
    e.user_id,
    e.author_name,
    e.template_id,
    e.top_text,
    e.bottom_text,
    e.score
  into v_top
  from public.caption_battle_entries e
  where e.battle_date = p_date
    and e.status = 'approved'
  order by e.score desc, e.created_at asc
  limit 1;

  if not found then
    return;
  end if;

  insert into public.caption_battle_winners (
    battle_date,
    entry_id,
    user_id,
    author_name,
    template_id,
    top_text,
    bottom_text,
    winning_score,
    crowned_until
  )
  values (
    p_date,
    v_top.id,
    v_top.user_id,
    v_top.author_name,
    v_top.template_id,
    v_top.top_text,
    v_top.bottom_text,
    greatest(0, coalesce(v_top.score, 0)),
    ((p_date + interval '2 days')::timestamp at time zone 'UTC')
  )
  on conflict (battle_date) do nothing;
end;
$$;

revoke all on function public.finalize_caption_battle_day(date) from public;
grant execute on function public.finalize_caption_battle_day(date) to service_role;

create or replace function public.get_daily_caption_battle(p_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := coalesce(p_date, timezone('utc', now())::date);
  v_yesterday date := v_today - 1;
  v_entries jsonb;
  v_yesterday_winner jsonb;
  v_my_votes jsonb;
  v_kings jsonb;
begin
  perform public.finalize_caption_battle_day(v_yesterday);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'battle_date', q.battle_date,
        'template_id', q.template_id,
        'user_id', q.user_id,
        'author_name', q.author_name,
        'top_text', q.top_text,
        'bottom_text', q.bottom_text,
        'score', q.score,
        'meme_id', q.meme_id,
        'status', q.status,
        'created_at', q.created_at
      )
      order by q.score desc, q.created_at asc
    ),
    '[]'::jsonb
  )
  into v_entries
  from (
    select
      e.id, e.battle_date, e.template_id, e.user_id, e.author_name,
      e.top_text, e.bottom_text, e.score, e.meme_id, e.status, e.created_at
    from public.caption_battle_entries e
    where e.battle_date = v_today
      and (e.status = 'approved' or (v_uid is not null and e.user_id = v_uid and e.status = 'pending'))
    order by e.score desc, e.created_at asc
    limit 60
  ) q;

  select jsonb_build_object(
    'battle_date', w.battle_date,
    'entry_id', w.entry_id,
    'user_id', w.user_id,
    'author_name', w.author_name,
    'template_id', w.template_id,
    'top_text', w.top_text,
    'bottom_text', w.bottom_text,
    'winning_score', w.winning_score,
    'crowned_until', w.crowned_until
  )
  into v_yesterday_winner
  from public.caption_battle_winners w
  where w.battle_date = v_yesterday;

  if v_uid is not null then
    select coalesce(jsonb_agg(v.entry_id), '[]'::jsonb)
    into v_my_votes
    from public.caption_battle_votes v
    join public.caption_battle_entries e on e.id = v.entry_id
    where v.user_id = v_uid
      and v.direction = 1
      and e.battle_date = v_today;
  else
    v_my_votes := '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'battle_date', w.battle_date,
        'user_id', w.user_id,
        'author_name', w.author_name,
        'crowned_until', w.crowned_until
      )
    ),
    '[]'::jsonb
  )
  into v_kings
  from public.caption_battle_winners w
  where w.crowned_until > now();

  return jsonb_build_object(
    'ok', true,
    'date_str', v_today::text,
    'yesterday_date_str', v_yesterday::text,
    'entries', v_entries,
    'yesterday_winner', v_yesterday_winner,
    'my_voted_entry_ids', v_my_votes,
    'active_kings', v_kings
  );
end;
$$;

revoke all on function public.get_daily_caption_battle(date) from public;
grant execute on function public.get_daily_caption_battle(date) to anon, authenticated, service_role;

create or replace function public.vote_caption_battle_entry(
  p_entry_id uuid,
  p_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_dir integer := case when coalesce(p_active, true) then 1 else 0 end;
  v_status text;
  v_rl jsonb;
  v_score integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'sign_in_required');
  end if;

  if public.is_suspended(v_uid) then
    return jsonb_build_object('ok', false, 'error', 'suspended');
  end if;

  select status into v_status
  from public.caption_battle_entries
  where id = p_entry_id;

  if not found or v_status <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'entry_not_found');
  end if;

  v_rl := public.check_and_record_rate_limit(v_uid, 'vote', public.request_ip_hash(), true);
  if not coalesce((v_rl->>'ok')::boolean, false) then
    return v_rl;
  end if;

  insert into public.caption_battle_votes (entry_id, user_id, direction)
  values (p_entry_id, v_uid, v_dir)
  on conflict (user_id, entry_id) do update
    set direction = excluded.direction,
        updated_at = now();

  select score into v_score
  from public.caption_battle_entries
  where id = p_entry_id;

  return jsonb_build_object(
    'ok', true,
    'entry_id', p_entry_id,
    'score', coalesce(v_score, 0),
    'voted', (v_dir = 1)
  );
end;
$$;

revoke all on function public.vote_caption_battle_entry(uuid, boolean) from public;
grant execute on function public.vote_caption_battle_entry(uuid, boolean) to authenticated, service_role;

create or replace function public.get_caption_hall_of_fame(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yesterday date := (timezone('utc', now())::date) - 1;
  v_lim integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_rows jsonb;
  v_kings jsonb;
begin
  perform public.finalize_caption_battle_day(v_yesterday);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'battle_date', q.battle_date,
        'entry_id', q.entry_id,
        'user_id', q.user_id,
        'author_name', q.author_name,
        'template_id', q.template_id,
        'top_text', q.top_text,
        'bottom_text', q.bottom_text,
        'winning_score', q.winning_score,
        'crowned_until', q.crowned_until,
        'created_at', q.created_at
      )
      order by q.battle_date desc
    ),
    '[]'::jsonb
  )
  into v_rows
  from (
    select
      w.battle_date, w.entry_id, w.user_id, w.author_name, w.template_id,
      w.top_text, w.bottom_text, w.winning_score, w.crowned_until, w.created_at
    from public.caption_battle_winners w
    order by w.battle_date desc
    limit v_lim
  ) q;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'battle_date', w.battle_date,
        'user_id', w.user_id,
        'author_name', w.author_name,
        'crowned_until', w.crowned_until
      )
    ),
    '[]'::jsonb
  )
  into v_kings
  from public.caption_battle_winners w
  where w.crowned_until > now();

  return jsonb_build_object(
    'ok', true,
    'winners', v_rows,
    'active_kings', v_kings
  );
end;
$$;

revoke all on function public.get_caption_hall_of_fame(integer) from public;
grant execute on function public.get_caption_hall_of_fame(integer) to anon, authenticated, service_role;

create or replace function public.get_active_caption_kings()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yesterday date := (timezone('utc', now())::date) - 1;
  v_kings jsonb;
begin
  perform public.finalize_caption_battle_day(v_yesterday);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'battle_date', w.battle_date,
        'user_id', w.user_id,
        'author_name', w.author_name,
        'crowned_until', w.crowned_until
      )
    ),
    '[]'::jsonb
  )
  into v_kings
  from public.caption_battle_winners w
  where w.crowned_until > now();

  return jsonb_build_object('ok', true, 'active_kings', v_kings);
end;
$$;

revoke all on function public.get_active_caption_kings() from public;
grant execute on function public.get_active_caption_kings() to anon, authenticated, service_role;
