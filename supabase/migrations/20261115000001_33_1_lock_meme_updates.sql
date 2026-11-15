-- ============================================================================
-- Migration 20261115000001 — Phase 33 task 33.1
-- Close the "anyone can edit any meme" hole (hotfix, smallest possible change).
--
-- Before (live DB, checked 15 Nov 2026): update policy "Anyone can update meme scores"
-- with `using (true)`, so ANY visitor holding the public key could change ANY meme's
-- title, image_url, score, reactions, etc. via the REST API. increment_meme_score ran
-- as the caller with no limit on `delta`.
--
-- After:
--   1. Only a meme's real signed-in author (auth.uid() = user_id) may update it.
--      Rows with user_id = null can no longer be updated by the public at all.
--   2. No public DELETE policy exists on memes.
--   3. A BEFORE UPDATE trigger refuses changes to image_url, poster_url,
--      base_image_url, author_name, user_id, score and status when the caller is
--      the public API role (anon / authenticated) — even for the author.
--      The service role, the SQL editor, and SECURITY DEFINER functions
--      (e.g. increment_meme_score, until task 33.8 replaces it) are not affected.
--   4. increment_meme_score becomes SECURITY DEFINER (so votes keep saving now that
--      the public cannot update memes directly) and clamps each call to ±2, the
--      most the site ever sends. Still not tamper-proof — task 33.8 replaces it.
--
-- Safe to run more than once. Runs as one transaction (SQL editor / migration tool).
-- ============================================================================

-- 1. Remove every existing UPDATE / DELETE policy on public.memes
--    (the schema file is not a reliable record of the live DB — see audit F14 —
--     so drop by lookup instead of by a single known name).
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'memes'
      and cmd in ('UPDATE', 'DELETE')
  loop
    execute format('drop policy if exists %I on public.memes', pol.policyname);
  end loop;
end
$$;

-- 2. Authors may update only their own memes (and cannot hand them to someone else).
create policy "Authors can update their own memes"
  on public.memes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- (Deliberately no DELETE policy for the public.)

-- 3. Column-level guard.
--    Uses to_jsonb() so columns that do not exist yet (e.g. `status`, added in 33.2)
--    are simply treated as unchanged instead of breaking the trigger.
create or replace function public.memes_guard_protected_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  col text;
  protected_cols constant text[] := array[
    'image_url', 'poster_url', 'base_image_url', 'author_name', 'user_id', 'score', 'status'
  ];
begin
  -- Only requests made directly by the public API roles are restricted.
  -- service_role, postgres (SQL editor) and SECURITY DEFINER functions pass through.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  foreach col in array protected_cols loop
    if (to_jsonb(new) -> col) is distinct from (to_jsonb(old) -> col) then
      raise exception 'Column "%" of public.memes can only be changed by the server', col
        using errcode = '42501'; -- insufficient_privilege
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists memes_guard_protected_columns on public.memes;
create trigger memes_guard_protected_columns
  before update on public.memes
  for each row
  execute function public.memes_guard_protected_columns();

-- 4. Keep votes working: run as the function owner and clamp the step size.
create or replace function public.increment_meme_score(row_id uuid, delta integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.memes
  set score = coalesce(score, 0) + greatest(-2, least(2, coalesce(delta, 0)))
  where id = row_id;
end;
$$;

grant execute on function public.increment_meme_score(uuid, integer) to anon, authenticated;
