-- Phase 33.51 (site review, 15 Nov 2026): least-privilege tidy-up.
-- Nothing here was exploitable (RLS already blocked every write), but the browser roles
-- held grants they never need. Removing them is defence in depth and clears advisor warnings.

-- 1. Trigger functions and the internal battle finaliser must not be callable over /rest/v1/rpc.
--    (Triggers keep firing: EXECUTE is only checked when a trigger is created.)
revoke execute on function public.handle_new_meme_mutation() from public, anon, authenticated;
revoke execute on function public.notify_on_comment() from public, anon, authenticated;
revoke execute on function public.notify_on_remix() from public, anon, authenticated;
revoke execute on function public.sync_caption_battle_entry_score() from public, anon, authenticated;
revoke execute on function public.sync_meme_reactions() from public, anon, authenticated;
revoke execute on function public.sync_meme_score_on_vote_delete() from public, anon, authenticated;
revoke execute on function public.memes_guard_protected_columns() from public, anon, authenticated;
-- Called only from get_daily_caption_battle() (SECURITY DEFINER), never by the browser.
revoke execute on function public.finalize_caption_battle_day(date) from public, anon, authenticated;

-- 2. Browser roles never need TRUNCATE / REFERENCES / TRIGGER on anything.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- 3. Writes go through Edge Functions and RPCs only.
revoke insert, delete on public.memes from anon, authenticated;
revoke update on public.memes from anon;               -- signed-in authors keep UPDATE (RLS + guard trigger)
revoke delete on public.comments from anon;            -- signed-in authors keep DELETE (RLS)
revoke insert, update, delete on public.memes_feed_view from anon, authenticated;
