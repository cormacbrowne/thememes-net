-- ============================================================================
-- Plan Phase 2.1 — Daily Caption Battle v2 (builds on 33.15's entries/votes/winners)
--
--   public.battle_settings   one row: start time, timezone, length, caption limit, prizes,
--                            vote threshold before totals show, auto-template rotation
--   public.battles           one battle per London day: image, prompt, theme, starts/ends,
--                            status scheduled|live|judging|complete|cancelled, sponsor (later)
--   caption_battle_entries   + battle_id, rank, updated_at; ONE entry per user per battle
--   caption_battle_winners   + battle_id, image_url
--   public.battle_awards     top 3 per battle (badge + play-money MemeDollarz to claim once;
--                            M$ live in the player's browser, never on the server)
--
--   battle_tick()            pg_cron every 5 min: make sure today's battle exists (auto from
--                            the template rotation if the admin queued nothing), open due
--                            battles, close finished ones (rank, crown winner, write awards)
--   get_battle_state()       what the app shows: live battle, entries (scores hidden until the
--                            caller has voted on N entries), my entry, yesterday's results
--   vote_caption_battle_entry  now refuses own entries and closed battles
--   admin_* RPCs             moderators: list, schedule, cancel battles, remove entries
--   claim_battle_award()     marks a prize as claimed (once)
-- ============================================================================

-- ---------------------------------------------------------------- settings
create table if not exists public.battle_settings (
  id boolean primary key default true check (id),
  start_local_time time not null default '09:00',
  timezone text not null default 'Europe/London',
  duration interval not null default interval '24 hours',
  caption_max integer not null default 120 check (caption_max between 20 and 280),
  votes_before_totals integer not null default 3 check (votes_before_totals between 0 and 20),
  prizes jsonb not null default '[
    {"rank": 1, "mdollarz": 50, "badge": "battle_champion"},
    {"rank": 2, "mdollarz": 25, "badge": "podium_finish"},
    {"rank": 3, "mdollarz": 15, "badge": "podium_finish"}
  ]'::jsonb,
  auto_templates jsonb not null default '[
    ["tpl-drake-compare", "/seed/tpl-drake-compare.webp", "Reject / Approve"],
    ["tpl-expanding-brain", "/seed/tpl-expanding-brain.webp", "Expanding Galaxy Brain"],
    ["tpl-two-buttons", "/seed/tpl-two-buttons.webp", "Two Red Buttons"],
    ["tpl-distracted-choice", "/seed/tpl-distracted-choice.webp", "Distracted By Shiny New Thing"],
    ["tpl-this-is-fine", "/seed/tpl-this-is-fine.webp", "This Is Fine"],
    ["tpl-change-my-mind", "/seed/tpl-change-my-mind.webp", "Change My Mind"],
    ["tpl-buff-vs-smol", "/seed/tpl-buff-vs-smol.webp", "Buff vs Smol"],
    ["tpl-stonks-up", "/seed/tpl-stonks-up.webp", "Stonks"],
    ["tpl-not-stonks", "/seed/tpl-not-stonks.webp", "Not Stonks"],
    ["tpl-woman-yelling-cat", "/seed/tpl-woman-yelling-cat.webp", "Yelling vs Unbothered Cat"],
    ["tpl-gigachad-verdict", "/seed/tpl-gigachad-verdict.webp", "GigaChad Verdict"],
    ["tpl-clown-makeup", "/seed/tpl-clown-makeup.webp", "4-Step Clown Protocol"],
    ["tpl-always-has-been", "/seed/tpl-always-has-been.webp", "Always Has Been"],
    ["tpl-brain-at-3am", "/seed/tpl-brain-at-3am.webp", "Brain At 3 AM"],
    ["tpl-surprised-shock", "/seed/tpl-surprised-shock.webp", "Surprised Shock Face"],
    ["tpl-trade-offer", "/seed/tpl-trade-offer.webp", "Trade Offer"],
    ["tpl-bell-curve-iq", "/seed/tpl-bell-curve-iq.webp", "IQ Bell Curve"],
    ["tpl-highway-exit", "/seed/tpl-highway-exit.webp", "Highway Exit"],
    ["tpl-spiderman-point", "/seed/tpl-spiderman-point.webp", "Double Clone Pointing"],
    ["tpl-trophy-celebration", "/seed/tpl-trophy-celebration.webp", "Over-Celebrating 3rd Place"]
  ]'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.battle_settings (id) values (true) on conflict (id) do nothing;
alter table public.battle_settings enable row level security;
revoke all on public.battle_settings from anon, authenticated;
drop policy if exists "Battle settings are public" on public.battle_settings;
create policy "Battle settings are public" on public.battle_settings for select using (true);
grant select on public.battle_settings to anon, authenticated;

-- ---------------------------------------------------------------- battles
create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  battle_day date not null,
  image_url text not null check (
    image_url ~ '^/seed/[a-z0-9-]+\.webp$'
    or image_url ~ '^https://otvvphmjojqyjaznjzyo\.supabase\.co/storage/v1/object/public/memes/battles/[a-z0-9-]+\.webp$'
  ),
  template_id text check (template_id is null or template_id ~ '^[a-z0-9-]{2,64}$'),
  title text not null default 'Daily Caption Battle' check (char_length(title) between 1 and 80),
  prompt text check (prompt is null or char_length(prompt) <= 200),
  theme text check (theme is null or char_length(theme) <= 40),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'judging', 'complete', 'cancelled')),
  sponsor jsonb,
  source text not null default 'auto' check (source in ('auto', 'admin')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint battles_window_check check (ends_at > starts_at)
);
create unique index if not exists battles_one_per_day_idx
  on public.battles (battle_day) where status <> 'cancelled';
create index if not exists battles_status_starts_idx on public.battles (status, starts_at);

alter table public.battles enable row level security;
revoke insert, update, delete on public.battles from anon, authenticated;
drop policy if exists "Started battles are public, queue is moderators only" on public.battles;
create policy "Started battles are public, queue is moderators only" on public.battles
  for select using (status in ('live', 'judging', 'complete') or public.is_moderator());

-- ---------------------------------------------------------------- entries / winners
alter table public.caption_battle_entries
  add column if not exists battle_id uuid references public.battles(id) on delete cascade,
  add column if not exists rank integer,
  add column if not exists updated_at timestamptz not null default now();
create unique index if not exists caption_battle_entries_one_per_user_idx
  on public.caption_battle_entries (battle_id, user_id) where battle_id is not null;
create index if not exists caption_battle_entries_battle_idx
  on public.caption_battle_entries (battle_id, status, score desc, created_at);

alter table public.caption_battle_winners
  add column if not exists battle_id uuid references public.battles(id) on delete set null,
  add column if not exists image_url text;

-- ---------------------------------------------------------------- awards
create table if not exists public.battle_awards (
  battle_id uuid not null references public.battles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid references public.caption_battle_entries(id) on delete set null,
  rank integer not null check (rank between 1 and 3),
  badge text not null,
  mdollarz integer not null default 0 check (mdollarz between 0 and 1000),
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (battle_id, user_id)
);
alter table public.battle_awards enable row level security;
revoke insert, update, delete on public.battle_awards from anon, authenticated;
drop policy if exists "Players read their own battle awards" on public.battle_awards;
create policy "Players read their own battle awards" on public.battle_awards
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------- helpers
create or replace function public.battle_window_for_day(p_day date)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select ((p_day + s.start_local_time) at time zone s.timezone) as starts_at,
         ((p_day + s.start_local_time) at time zone s.timezone) + s.duration as ends_at
  from public.battle_settings s
  where s.id;
$$;
revoke all on function public.battle_window_for_day(date) from public;

create or replace function public.battle_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone s.timezone)::date from public.battle_settings s where s.id;
$$;
revoke all on function public.battle_today() from public;

-- Make sure today's battle exists (auto from the rotation when nothing was queued).
create or replace function public.ensure_daily_battle(p_day date default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := coalesce(p_day, public.battle_today());
  v_id uuid;
  v_tpls jsonb;
  v_tpl jsonb;
  v_win record;
begin
  select b.id into v_id from public.battles b where b.battle_day = v_day and b.status <> 'cancelled';
  if found then
    return v_id;
  end if;
  select s.auto_templates into v_tpls from public.battle_settings s where s.id;
  if v_tpls is null or jsonb_array_length(v_tpls) = 0 then
    return null;
  end if;
  v_tpl := v_tpls -> ((v_day - date '2026-01-01') % jsonb_array_length(v_tpls));
  select * into v_win from public.battle_window_for_day(v_day);
  insert into public.battles (battle_day, image_url, template_id, title, starts_at, ends_at, status, source)
  values (v_day, v_tpl ->> 1, v_tpl ->> 0, coalesce(v_tpl ->> 2, 'Daily Caption Battle'),
          v_win.starts_at, v_win.ends_at, 'scheduled', 'auto')
  on conflict do nothing
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.ensure_daily_battle(date) from public;
grant execute on function public.ensure_daily_battle(date) to service_role;

-- Close one battle: rank entries, crown the winner (Hall of Fame), write top-3 awards.
create or replace function public.close_battle(p_battle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.battles%rowtype;
  v_prizes jsonb;
  v_top record;
begin
  select * into v_b from public.battles where id = p_battle_id for update;
  if not found or v_b.status not in ('live', 'judging') then
    return;
  end if;
  update public.battles set status = 'judging' where id = p_battle_id;

  update public.caption_battle_entries e
  set rank = r.rnk
  from (
    select id, row_number() over (order by score desc, created_at asc) as rnk
    from public.caption_battle_entries
    where battle_id = p_battle_id and status = 'approved'
  ) r
  where e.id = r.id;

  select s.prizes into v_prizes from public.battle_settings s where s.id;

  insert into public.battle_awards (battle_id, user_id, entry_id, rank, badge, mdollarz)
  select p_battle_id, e.user_id, e.id, e.rank,
         coalesce(pz.p ->> 'badge', 'podium_finish'), coalesce((pz.p ->> 'mdollarz')::integer, 0)
  from public.caption_battle_entries e
  join lateral (
    select x as p from jsonb_array_elements(v_prizes) x where (x ->> 'rank')::integer = e.rank limit 1
  ) pz on true
  where e.battle_id = p_battle_id and e.status = 'approved' and e.rank between 1 and 3
  on conflict (battle_id, user_id) do nothing;

  select e.* into v_top
  from public.caption_battle_entries e
  where e.battle_id = p_battle_id and e.status = 'approved' and e.rank = 1;

  if found then
    insert into public.caption_battle_winners (
      battle_date, battle_id, entry_id, user_id, author_name, template_id, image_url,
      top_text, bottom_text, winning_score, crowned_until
    ) values (
      v_b.battle_day, p_battle_id, v_top.id, v_top.user_id, v_top.author_name,
      coalesce(v_b.template_id, 'custom'), v_b.image_url,
      v_top.top_text, v_top.bottom_text, greatest(0, v_top.score), v_b.ends_at + interval '24 hours'
    )
    on conflict (battle_date) do nothing;
  end if;

  update public.battles set status = 'complete', closed_at = now() where id = p_battle_id;
end;
$$;
revoke all on function public.close_battle(uuid) from public;
grant execute on function public.close_battle(uuid) to service_role;

create or replace function public.battle_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.ensure_daily_battle(public.battle_today());
  update public.battles set status = 'live'
  where status = 'scheduled' and starts_at <= now() and ends_at > now();
  for v_id in
    select id from public.battles where status in ('live', 'judging', 'scheduled') and ends_at <= now()
  loop
    update public.battles set status = 'live' where id = v_id and status = 'scheduled';
    perform public.close_battle(v_id);
  end loop;
end;
$$;
revoke all on function public.battle_tick() from public;
grant execute on function public.battle_tick() to service_role;

-- ---------------------------------------------------------------- what the app reads
create or replace function public.get_battle_state(p_battle_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_b public.battles%rowtype;
  v_prev public.battles%rowtype;
  v_threshold integer;
  v_my_votes jsonb := '[]'::jsonb;
  v_my_skips jsonb := '[]'::jsonb;
  v_vote_count integer := 0;
  v_others integer := 0;
  v_show_totals boolean;
  v_entries jsonb;
  v_my_entry jsonb;
  v_prev_top jsonb;
  v_my_award jsonb;
  v_entry_count integer;
begin
  perform public.battle_tick();

  if p_battle_id is not null then
    select * into v_b from public.battles where id = p_battle_id and status in ('live', 'judging', 'complete');
  else
    select * into v_b from public.battles where status = 'live' order by starts_at desc limit 1;
  end if;

  select s.votes_before_totals into v_threshold from public.battle_settings s where s.id;

  if v_b.id is not null then
    select count(*) into v_entry_count
    from public.caption_battle_entries where battle_id = v_b.id and status = 'approved';

    if v_uid is not null then
      -- "Funny" = direction 1 (scores a point); "Skip" = direction 0 (seen, no point).
      -- Both count towards the votes needed before live totals are shown.
      select coalesce(jsonb_agg(v.entry_id) filter (where v.direction = 1), '[]'::jsonb), count(*)
      into v_my_votes, v_vote_count
      from public.caption_battle_votes v
      join public.caption_battle_entries e on e.id = v.entry_id
      where v.user_id = v_uid and e.battle_id = v_b.id;

      select coalesce(jsonb_agg(v.entry_id) filter (where v.direction = 0), '[]'::jsonb)
      into v_my_skips
      from public.caption_battle_votes v
      join public.caption_battle_entries e on e.id = v.entry_id
      where v.user_id = v_uid and e.battle_id = v_b.id;

      select to_jsonb(x) into v_my_entry from (
        select e.id, e.top_text, e.bottom_text, e.status, e.created_at, e.updated_at, e.rank,
               case when v_b.status = 'complete' then e.score end as score
        from public.caption_battle_entries e
        where e.battle_id = v_b.id and e.user_id = v_uid
      ) x;
    end if;

    select count(*) into v_others
    from public.caption_battle_entries
    where battle_id = v_b.id and status = 'approved' and (v_uid is null or user_id <> v_uid);

    v_show_totals := v_b.status = 'complete' or v_vote_count >= least(v_threshold, v_others);

    select coalesce(jsonb_agg(to_jsonb(q) order by q.sort_score desc, q.created_at), '[]'::jsonb)
    into v_entries
    from (
      select e.id, e.author_name, e.top_text, e.bottom_text, e.status, e.created_at, e.rank,
             (v_uid is not null and e.user_id = v_uid) as is_mine,
             case when v_show_totals then e.score end as score,
             case when v_show_totals then e.score else 0 end as sort_score
      from public.caption_battle_entries e
      where e.battle_id = v_b.id
        and (e.status = 'approved' or (v_uid is not null and e.user_id = v_uid and e.status = 'pending'))
      order by e.score desc, e.created_at
      limit 200
    ) q;
  end if;

  -- Yesterday's (most recent finished) battle: top 3 and my award.
  select * into v_prev from public.battles
  where status = 'complete' and (v_b.id is null or id <> v_b.id)
  order by ends_at desc limit 1;

  if v_prev.id is not null then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.rank), '[]'::jsonb) into v_prev_top
    from (
      select e.id, e.rank, e.author_name, e.top_text, e.bottom_text, e.score
      from public.caption_battle_entries e
      where e.battle_id = v_prev.id and e.status = 'approved' and e.rank between 1 and 3
    ) t;
    if v_uid is not null then
      select to_jsonb(a) into v_my_award from (
        select battle_id, rank, badge, mdollarz, claimed_at from public.battle_awards
        where battle_id = v_prev.id and user_id = v_uid
      ) a;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'battle', case when v_b.id is null then null else jsonb_build_object(
      'id', v_b.id, 'battle_day', v_b.battle_day, 'image_url', v_b.image_url,
      'template_id', v_b.template_id, 'title', v_b.title, 'prompt', v_b.prompt, 'theme', v_b.theme,
      'starts_at', v_b.starts_at, 'ends_at', v_b.ends_at, 'status', v_b.status, 'sponsor', v_b.sponsor
    ) end,
    'entry_count', coalesce(v_entry_count, 0),
    'entries', coalesce(v_entries, '[]'::jsonb),
    'show_totals', coalesce(v_show_totals, false),
    'votes_needed', greatest(0, least(coalesce(v_threshold, 3), v_others) - v_vote_count),
    'my_votes', v_my_votes,
    'my_skips', v_my_skips,
    'my_entry', v_my_entry,
    'previous', case when v_prev.id is null then null else jsonb_build_object(
      'id', v_prev.id, 'battle_day', v_prev.battle_day, 'image_url', v_prev.image_url,
      'title', v_prev.title, 'theme', v_prev.theme, 'ends_at', v_prev.ends_at,
      'top', coalesce(v_prev_top, '[]'::jsonb), 'my_award', v_my_award
    ) end,
    'settings', (select jsonb_build_object('caption_max', s.caption_max, 'votes_before_totals', s.votes_before_totals)
                 from public.battle_settings s where s.id)
  );
end;
$$;
revoke all on function public.get_battle_state(uuid) from public;
grant execute on function public.get_battle_state(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------- voting rules
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
  v_entry record;
  v_rl jsonb;
  v_score integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'sign_in_required');
  end if;
  if public.is_suspended(v_uid) then
    return jsonb_build_object('ok', false, 'error', 'suspended');
  end if;

  select e.status, e.user_id, e.battle_id, b.status as battle_status
  into v_entry
  from public.caption_battle_entries e
  left join public.battles b on b.id = e.battle_id
  where e.id = p_entry_id;

  if not found or v_entry.status <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'entry_not_found');
  end if;
  if v_entry.user_id = v_uid then
    return jsonb_build_object('ok', false, 'error', 'own_entry');
  end if;
  if v_entry.battle_id is not null and v_entry.battle_status <> 'live' then
    return jsonb_build_object('ok', false, 'error', 'battle_closed');
  end if;

  v_rl := public.check_and_record_rate_limit(v_uid, 'vote', public.request_ip_hash(), true);
  if not coalesce((v_rl->>'ok')::boolean, false) then
    return v_rl;
  end if;

  insert into public.caption_battle_votes (entry_id, user_id, direction)
  values (p_entry_id, v_uid, v_dir)
  on conflict (user_id, entry_id) do update
    set direction = excluded.direction, updated_at = now();

  select score into v_score from public.caption_battle_entries where id = p_entry_id;
  return jsonb_build_object('ok', true, 'entry_id', p_entry_id, 'score', coalesce(v_score, 0), 'voted', (v_dir = 1));
end;
$$;
revoke all on function public.vote_caption_battle_entry(uuid, boolean) from public;
grant execute on function public.vote_caption_battle_entry(uuid, boolean) to authenticated, service_role;

-- ---------------------------------------------------------------- prizes
create or replace function public.claim_battle_award(p_battle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_award public.battle_awards%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'sign_in_required');
  end if;
  update public.battle_awards set claimed_at = now()
  where battle_id = p_battle_id and user_id = v_uid and claimed_at is null
  returning * into v_award;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'nothing_to_claim');
  end if;
  return jsonb_build_object('ok', true, 'rank', v_award.rank, 'badge', v_award.badge, 'mdollarz', v_award.mdollarz);
end;
$$;
revoke all on function public.claim_battle_award(uuid) from public;
grant execute on function public.claim_battle_award(uuid) to authenticated;

-- ---------------------------------------------------------------- admin
create or replace function public.admin_list_battles()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  perform public.battle_tick();
  return jsonb_build_object('ok', true, 'battles', coalesce((
    select jsonb_agg(to_jsonb(x) order by x.battle_day desc)
    from (
      select b.*, (select count(*) from public.caption_battle_entries e where e.battle_id = b.id) as entry_count
      from public.battles b
      where b.battle_day >= public.battle_today() - 14
    ) x
  ), '[]'::jsonb));
end;
$$;
revoke all on function public.admin_list_battles() from public;
grant execute on function public.admin_list_battles() to authenticated;

create or replace function public.admin_schedule_battle(
  p_day date,
  p_image_url text,
  p_title text default null,
  p_prompt text default null,
  p_theme text default null,
  p_template_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.battles%rowtype;
  v_win record;
  v_id uuid;
begin
  if not public.is_moderator() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_day is null or p_day < public.battle_today() then
    return jsonb_build_object('ok', false, 'error', 'day_in_past');
  end if;

  select * into v_existing from public.battles where battle_day = p_day and status <> 'cancelled';
  if found then
    if v_existing.status <> 'scheduled' then
      return jsonb_build_object('ok', false, 'error', 'already_started');
    end if;
    if v_existing.source = 'admin' then
      return jsonb_build_object('ok', false, 'error', 'day_taken');
    end if;
    update public.battles set status = 'cancelled' where id = v_existing.id;
  end if;

  select * into v_win from public.battle_window_for_day(p_day);
  insert into public.battles (battle_day, image_url, template_id, title, prompt, theme, starts_at, ends_at,
                              status, source, created_by)
  values (p_day, p_image_url, nullif(p_template_id, ''),
          coalesce(nullif(btrim(p_title), ''), 'Daily Caption Battle'),
          nullif(btrim(p_prompt), ''), nullif(btrim(p_theme), ''),
          v_win.starts_at, v_win.ends_at,
          case when v_win.starts_at <= now() then 'live' else 'scheduled' end,
          'admin', auth.uid())
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
revoke all on function public.admin_schedule_battle(date, text, text, text, text, text) from public;
grant execute on function public.admin_schedule_battle(date, text, text, text, text, text) to authenticated;

create or replace function public.admin_cancel_battle(p_battle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  update public.battles set status = 'cancelled' where id = p_battle_id and status = 'scheduled';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_cancellable');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.admin_cancel_battle(uuid) from public;
grant execute on function public.admin_cancel_battle(uuid) to authenticated;

create or replace function public.admin_battle_entries(p_battle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  return jsonb_build_object('ok', true, 'entries', coalesce((
    select jsonb_agg(to_jsonb(x) order by x.score desc, x.created_at)
    from (
      select id, user_id, author_name, top_text, bottom_text, score, status, rank, created_at
      from public.caption_battle_entries where battle_id = p_battle_id
    ) x
  ), '[]'::jsonb));
end;
$$;
revoke all on function public.admin_battle_entries(uuid) from public;
grant execute on function public.admin_battle_entries(uuid) to authenticated;

create or replace function public.admin_remove_battle_entry(p_entry_id uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not public.is_moderator() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  update public.caption_battle_entries set status = 'removed', updated_at = now()
  where id = p_entry_id and status <> 'removed'
  returning user_id into v_user;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  insert into public.moderation_actions (moderator_id, action, target_user_id, reason, note)
  values (auth.uid(), 'remove_battle_entry', v_user, 'other', left(coalesce(p_note, '') || ' entry ' || p_entry_id::text, 300));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.admin_remove_battle_entry(uuid, text) from public;
grant execute on function public.admin_remove_battle_entry(uuid, text) to authenticated;

-- ---------------------------------------------------------------- legacy finalizer
-- The 33.15 once-a-day finalizer (keyed on the UTC date) must never crown v2 entries:
-- v2 battles are closed by close_battle(). It keeps handling any legacy (battle_id null) rows.
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
  select e.id, e.user_id, e.author_name, e.template_id, e.top_text, e.bottom_text, e.score
  into v_top
  from public.caption_battle_entries e
  where e.battle_date = p_date and e.status = 'approved' and e.battle_id is null
  order by e.score desc, e.created_at asc
  limit 1;
  if not found then
    return;
  end if;
  insert into public.caption_battle_winners (
    battle_date, entry_id, user_id, author_name, template_id, top_text, bottom_text, winning_score, crowned_until
  ) values (
    p_date, v_top.id, v_top.user_id, v_top.author_name, v_top.template_id, v_top.top_text, v_top.bottom_text,
    greatest(0, coalesce(v_top.score, 0)), ((p_date + interval '2 days')::timestamp at time zone 'UTC')
  )
  on conflict (battle_date) do nothing;
end;
$$;
revoke all on function public.finalize_caption_battle_day(date) from public;
grant execute on function public.finalize_caption_battle_day(date) to service_role;

-- ---------------------------------------------------------------- schedule
do $$
begin
  if exists (select 1 from cron.job where jobname = 'battle-tick') then
    perform cron.unschedule('battle-tick');
  end if;
  perform cron.schedule('battle-tick', '*/5 * * * *', 'select public.battle_tick();');
end
$$;

select public.battle_tick();
