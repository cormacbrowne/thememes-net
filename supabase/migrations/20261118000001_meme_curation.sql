-- Owner brief 18 Nov 2026 (item 3): moderators/admins can curate the meme feed.
--
-- * mod_curate_meme(meme_id, restore): reversible hide of a live meme (status 'removed',
--   removed_reason 'curated'). Unlike a moderation removal it gives the author NO strike and
--   leaves the files where they are, so "Restore" brings it straight back.
-- * hidden_seed_memes + mod_hide_seed(seed_id, hide): the built-in seed memes ship in the app
--   bundle, so hiding one means listing its id here; the feed filters them out.
-- Every call is logged in moderation_actions ('curate' / 'restore' / 'hide_seed' / 'show_seed').

create table if not exists public.hidden_seed_memes (
  seed_id text primary key check (char_length(seed_id) between 1 and 120),
  hidden_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.hidden_seed_memes enable row level security;

drop policy if exists hidden_seed_memes_read on public.hidden_seed_memes;
create policy hidden_seed_memes_read on public.hidden_seed_memes
  for select to anon, authenticated using (true);

grant select on public.hidden_seed_memes to anon, authenticated;

create or replace function public.mod_curate_meme(p_meme_id uuid, p_restore boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_reason text;
begin
  if v_uid is null
     or not exists (select 1 from public.profiles where id = v_uid and role in ('moderator', 'admin')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select status, removed_reason into v_status, v_reason
  from public.memes where id = p_meme_id for update;
  if v_status is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if p_restore then
    -- Only undo a curation; a moderation removal must go back through the queue.
    if v_status <> 'removed' or coalesce(v_reason, '') <> 'curated' then
      return jsonb_build_object('ok', false, 'error', 'not_curated');
    end if;
    update public.memes set status = 'approved', removed_reason = null where id = p_meme_id;
  else
    if v_status <> 'approved' then
      return jsonb_build_object('ok', false, 'error', 'not_live');
    end if;
    update public.memes set status = 'removed', removed_reason = 'curated' where id = p_meme_id;
  end if;

  insert into public.moderation_actions (moderator_id, action, meme_id, reason)
  values (v_uid, case when p_restore then 'restore' else 'curate' end, p_meme_id, 'curated');

  if not p_restore then
    begin
      perform realtime.send(jsonb_build_object('meme_id', p_meme_id), 'hidden', 'moderation', false);
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object('ok', true, 'status', case when p_restore then 'approved' else 'removed' end);
end;
$$;

create or replace function public.mod_hide_seed(p_seed_id text, p_hide boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id text := left(btrim(coalesce(p_seed_id, '')), 120);
begin
  if v_uid is null
     or not exists (select 1 from public.profiles where id = v_uid and role in ('moderator', 'admin')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_id = '' then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;

  if p_hide then
    insert into public.hidden_seed_memes (seed_id, hidden_by) values (v_id, v_uid)
    on conflict (seed_id) do nothing;
  else
    delete from public.hidden_seed_memes where seed_id = v_id;
  end if;

  insert into public.moderation_actions (moderator_id, action, reason, note)
  values (v_uid, case when p_hide then 'hide_seed' else 'show_seed' end, 'curated', 'seed ' || v_id);

  return jsonb_build_object('ok', true, 'hidden', p_hide);
end;
$$;

revoke all on function public.mod_curate_meme(uuid, boolean) from public, anon;
revoke all on function public.mod_hide_seed(text, boolean) from public, anon;
grant execute on function public.mod_curate_meme(uuid, boolean) to authenticated;
grant execute on function public.mod_hide_seed(text, boolean) to authenticated;
