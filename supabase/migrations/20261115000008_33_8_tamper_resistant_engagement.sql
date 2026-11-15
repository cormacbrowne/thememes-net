-- ============================================================================
-- Migration 20261115000008 — Phase 33 task 33.8
-- Make votes, reactions, comments and notifications tamper-resistant.
--
--   1. public.memes baseline columns (`base_score`, `base_reactions`) so score and
--      reactions are always recomputed from `public.votes` / `public.reactions`
--      while preserving pre-33.8 historical counts, plus protected-column guard.
--   2. public.votes (user_id uuid references auth.users) + `cast_vote(p_meme_id, p_direction)`:
--      idempotent per-(user_id, meme_id), direction in (-1, 0, 1) — combo multipliers
--      never affect stored score. Revokes public/anon/authenticated execute on
--      `increment_meme_score`.
--   3. public.reactions (meme_id, user_id, emoji, active) + trigger maintaining
--      `memes.reactions` + `toggle_reaction(p_meme_id, p_emoji, p_active)` RPC.
--   4. public.comments declarative definition, RLS, author DELETE policy (non-suspended),
--      and server notification trigger (inserts stay in `post-comment`).
--   5. public.notifications: `recipient_id = auth.uid()` SELECT RLS, zero public
--      INSERT/UPDATE/DELETE, created only by server triggers/RPCs, plus
--      `mark_notifications_read(p_ids)` RPC.
--   6. Safe fix for `handle_new_meme_mutation()` (remove non-existent `profiles.xp`
--      update and pin `search_path = ''`).
--
-- Safe to run more than once (uses CREATE OR REPLACE / IF NOT EXISTS, no DROP/DELETE DML).
-- ============================================================================

-- 1. Memes baseline columns & protected-column guard -----------------------------------
alter table public.memes add column if not exists base_score integer;
update public.memes set base_score = coalesce(score, 1) where base_score is null;
alter table public.memes alter column base_score set default 1;
alter table public.memes alter column base_score set not null;

alter table public.memes add column if not exists base_reactions jsonb;
update public.memes
set base_reactions = coalesce(reactions, '{"🔥": 0, "💀": 0, "😂": 0, "🗿": 0}'::jsonb)
where base_reactions is null;
alter table public.memes alter column base_reactions set default '{"🔥": 0, "💀": 0, "😂": 0, "🗿": 0}'::jsonb;
alter table public.memes alter column base_reactions set not null;

create or replace function public.memes_guard_protected_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  col text;
  protected_cols constant text[] := array[
    'image_url', 'poster_url', 'base_image_url', 'author_name', 'user_id', 'score', 'base_score',
    'reactions', 'base_reactions', 'mutation_count', 'status', 'sha256', 'phash', 'moderation',
    'removed_reason', 'media_type', 'width', 'height', 'duration_sec', 'parent_meme_id',
    'root_meme_id', 'generation', 'created_at'
  ];
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  foreach col in array protected_cols loop
    if (to_jsonb(new) -> col) is distinct from (to_jsonb(old) -> col) then
      raise exception 'Column "%" of public.memes can only be changed by the server', col
        using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

-- Fix handle_new_meme_mutation so remixes with a non-null parent user_id never fail on missing profiles.xp
create or replace function public.handle_new_meme_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_gen integer;
  v_parent_root uuid;
begin
  if new.parent_meme_id is not null then
    select generation, coalesce(root_meme_id, id)
    into v_parent_gen, v_parent_root
    from public.memes
    where id = new.parent_meme_id;

    new.generation := coalesce(v_parent_gen, 0) + 1;
    new.root_meme_id := v_parent_root;

    update public.memes
    set mutation_count = coalesce(mutation_count, 0) + 1
    where id = new.parent_meme_id;
  end if;

  return new;
end;
$$;

-- 2. Notifications table (server-only creation; recipient_id = auth.uid() select) -------
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_id uuid references auth.users(id) on delete cascade not null,
  recipient_username text,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null default 'Someone',
  type text not null check (type in ('remix', 'upvote', 'reaction', 'comment', 'bounty', 'royalty')),
  meme_id uuid references public.memes(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications add column if not exists recipient_id uuid references auth.users(id) on delete cascade;
alter table public.notifications add column if not exists actor_id uuid references auth.users(id) on delete set null;

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;
revoke insert, update, delete on table public.notifications from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'Users can read their own notifications'
  ) then
    create policy "Users can read their own notifications"
      on public.notifications for select
      to authenticated
      using ((select auth.uid()) is not null and (select auth.uid()) = recipient_id);
  end if;
end
$$;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_updated integer := 0;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'sign_in_required');
  end if;

  update public.notifications
  set read = true
  where recipient_id = v_uid
    and read = false
    and (p_ids is null or cardinality(p_ids) = 0 or id = any(p_ids));

  get diagnostics v_updated = row_count;
  return jsonb_build_object('ok', true, 'updated', v_updated);
end;
$$;

revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception when others then
  null;
end
$$;

-- 3. Votes table + idempotent cast_vote(p_meme_id, p_direction) ------------------------
create table if not exists public.votes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  meme_id uuid references public.memes(id) on delete cascade not null,
  direction integer not null check (direction in (-1, 0, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, meme_id)
);

alter table public.votes add column if not exists updated_at timestamptz not null default now();
create index if not exists votes_meme_id_idx on public.votes (meme_id);

alter table public.votes enable row level security;
revoke insert, update, delete on table public.votes from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'votes'
      and policyname = 'Users can view their own votes'
  ) then
    create policy "Users can view their own votes"
      on public.votes for select
      to authenticated
      using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
  end if;
end
$$;

create or replace function public.sync_meme_score_on_vote_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.memes m
  set score = m.base_score + coalesce((
    select sum(v.direction)::integer
    from public.votes v
    where v.meme_id = old.meme_id
  ), 0)
  where m.id = old.meme_id;
  return old;
end;
$$;

create or replace trigger trg_votes_recompute_score_on_delete
  after delete on public.votes
  for each row
  execute function public.sync_meme_score_on_vote_delete();

create or replace function public.cast_vote(p_meme_id uuid, p_direction integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
    'changed', v_changed
  );
end;
$$;

revoke all on function public.cast_vote(uuid, integer) from public, anon;
grant execute on function public.cast_vote(uuid, integer) to authenticated, service_role;

-- Revoke public/anon/authenticated execute on the legacy increment_meme_score RPC
revoke all on function public.increment_meme_score(uuid, integer) from public, anon, authenticated;
grant execute on function public.increment_meme_score(uuid, integer) to service_role;

-- 4. Reactions table + trigger + toggle_reaction() -------------------------------------
create table if not exists public.reactions (
  id uuid default gen_random_uuid() primary key,
  meme_id uuid references public.memes(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  emoji text not null check (emoji in ('🔥', '💀', '😂', '🗿')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meme_id, user_id, emoji)
);

alter table public.reactions add column if not exists active boolean not null default true;
alter table public.reactions add column if not exists updated_at timestamptz not null default now();
create index if not exists reactions_meme_id_idx on public.reactions (meme_id);

alter table public.reactions enable row level security;
revoke insert, update, delete on table public.reactions from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reactions'
      and policyname = 'Users can view their own reactions'
  ) then
    create policy "Users can view their own reactions"
      on public.reactions for select
      to authenticated
      using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
  end if;
end
$$;

create or replace function public.sync_meme_reactions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meme_id uuid := coalesce(new.meme_id, old.meme_id);
begin
  with counts as (
    select emoji, count(*)::integer as cnt
    from public.reactions
    where meme_id = v_meme_id
      and active = true
    group by emoji
  )
  update public.memes m
  set reactions = jsonb_build_object(
    '🔥', coalesce((m.base_reactions ->> '🔥')::integer, 0) + coalesce((select cnt from counts where emoji = '🔥'), 0),
    '💀', coalesce((m.base_reactions ->> '💀')::integer, 0) + coalesce((select cnt from counts where emoji = '💀'), 0),
    '😂', coalesce((m.base_reactions ->> '😂')::integer, 0) + coalesce((select cnt from counts where emoji = '😂'), 0),
    '🗿', coalesce((m.base_reactions ->> '🗿')::integer, 0) + coalesce((select cnt from counts where emoji = '🗿'), 0)
  )
  where m.id = v_meme_id;

  return coalesce(new, old);
end;
$$;

create or replace trigger trg_reactions_sync_meme_counts
  after insert or update of active or delete on public.reactions
  for each row
  execute function public.sync_meme_reactions();

create or replace function public.toggle_reaction(
  p_meme_id uuid,
  p_emoji text,
  p_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rl jsonb;
  v_meme_status text;
  v_owner uuid;
  v_owner_name text;
  v_title text;
  v_active boolean := coalesce(p_active, true);
  v_prev_active boolean;
  v_reactions jsonb;
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

  if p_meme_id is null or p_emoji not in ('🔥', '💀', '😂', '🗿') then
    return jsonb_build_object('ok', false, 'error', 'invalid_reaction');
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

  select active
  into v_prev_active
  from public.reactions
  where meme_id = p_meme_id and user_id = v_uid and emoji = p_emoji
  for update;

  insert into public.reactions (meme_id, user_id, emoji, active, updated_at)
  values (p_meme_id, v_uid, p_emoji, v_active, now())
  on conflict (meme_id, user_id, emoji)
  do update set active = excluded.active, updated_at = now();

  if v_active and coalesce(v_prev_active, false) = false
     and v_owner is not null and v_owner <> v_uid then
    if not exists (
      select 1 from public.notifications n
      where n.recipient_id = v_owner
        and n.actor_id = v_uid
        and n.meme_id = p_meme_id
        and n.type = 'reaction'
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
        'reaction',
        p_meme_id,
        p_emoji || ' Someone reacted to your meme "' || left(coalesce(v_title, 'Meme'), 36) || '"!'
      );
    end if;
  end if;

  select reactions into v_reactions from public.memes where id = p_meme_id;

  return jsonb_build_object(
    'ok', true,
    'meme_id', p_meme_id,
    'emoji', p_emoji,
    'active', v_active,
    'reactions', v_reactions
  );
end;
$$;

revoke all on function public.toggle_reaction(uuid, text, boolean) from public, anon;
grant execute on function public.toggle_reaction(uuid, text, boolean) to authenticated, service_role;

-- 5. Comments declarative schema, RLS, author delete, and server notification trigger --
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  meme_id uuid references public.memes(id) on delete cascade not null,
  author_name text not null,
  body text not null,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'visible' check (status in ('visible', 'pending', 'removed')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.comments'::regclass and conname = 'comments_user_id_fkey'
  ) then
    alter table public.comments
      add constraint comments_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete set null not valid;
  end if;
end
$$;

alter table public.comments enable row level security;
revoke insert, update on table public.comments from public, anon, authenticated;
grant delete on table public.comments to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'comments'
      and policyname = 'Authors can delete their own comments'
  ) then
    create policy "Authors can delete their own comments"
      on public.comments for delete
      to authenticated
      using (
        (select auth.uid()) is not null
        and (select auth.uid()) = user_id
        and not public.is_suspended((select auth.uid()))
      );
  end if;
end
$$;

create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_owner_name text;
  v_title text;
  v_status text;
begin
  if new.status is distinct from 'visible' then
    return new;
  end if;

  select user_id, author_name, title, status
  into v_owner, v_owner_name, v_title, v_status
  from public.memes
  where id = new.meme_id;

  if v_status = 'approved' and v_owner is not null and v_owner is distinct from new.user_id then
    insert into public.notifications (
      recipient_id, recipient_username, actor_id, actor_name, type, meme_id, message
    )
    values (
      v_owner,
      v_owner_name,
      new.user_id,
      coalesce(new.author_name, 'Someone'),
      'comment',
      new.meme_id,
      '💬 @' || coalesce(new.author_name, 'Someone') || ' commented on "' || left(coalesce(v_title, 'Meme'), 36) || '"!'
    );
  end if;

  return new;
end;
$$;

create or replace trigger trg_comments_notify_owner
  after insert on public.comments
  for each row
  execute function public.notify_on_comment();

-- 6. Server-only remix notification trigger on public.memes ---------------------------
create or replace function public.notify_on_remix()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_owner uuid;
  v_parent_owner_name text;
  v_parent_title text;
begin
  if new.parent_meme_id is null or new.status is distinct from 'approved' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'approved' then
    return new;
  end if;

  select user_id, author_name, title
  into v_parent_owner, v_parent_owner_name, v_parent_title
  from public.memes
  where id = new.parent_meme_id;

  if v_parent_owner is not null and v_parent_owner is distinct from new.user_id then
    insert into public.notifications (
      recipient_id, recipient_username, actor_id, actor_name, type, meme_id, message
    )
    values (
      v_parent_owner,
      v_parent_owner_name,
      new.user_id,
      coalesce(new.author_name, 'Someone'),
      'remix',
      new.id,
      '🧬 @' || coalesce(new.author_name, 'Someone') || ' remixed your meme "' || left(coalesce(v_parent_title, 'Meme'), 32) || '"!'
    );
  end if;

  return new;
end;
$$;

create or replace trigger trg_memes_notify_remix
  after insert or update of status on public.memes
  for each row
  execute function public.notify_on_remix();
