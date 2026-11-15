-- ============================================================================
-- Migration 20261115000004 — Phase 33 task 33.4 (text moderation for comments)
--
-- Before (live DB, 15 Nov 2026): policy "Anyone can post comments" INSERT with check (true),
-- so anyone holding the publishable key could post any text, unfiltered, as any name.
--
-- After:
--   * No public INSERT/UPDATE/DELETE policy: comments are created only by the `post-comment`
--     Edge Function (service role), after the text filter + OpenAI moderation.
--   * comments.user_id records which account posted (author_name is set by the server).
--   * Max 280 characters for new comments (existing rows are not re-checked: NOT VALID).
--   * Reading comments stays public (unchanged).
--
-- Task 33.8 later adds a `status` column, author deletes and rate limits.
-- Safe to run more than once.
-- ============================================================================

alter table public.comments add column if not exists user_id uuid;
create index if not exists comments_meme_id_idx on public.comments (meme_id, created_at);

do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'comments' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on public.comments', pol.policyname);
  end loop;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.comments'::regclass and conname = 'comments_body_length_check'
  ) then
    alter table public.comments
      add constraint comments_body_length_check
      check (char_length(body) between 1 and 280) not valid;
  end if;
end
$$;
