-- ============================================================================
-- Revoke anon EXECUTE on SECURITY DEFINER RPCs that anon should not call.
-- Supabase's default privileges grant EXECUTE on every new public function to anon and
-- authenticated directly, so the `revoke ... from public` in earlier migrations did not stick.
--
-- Internal (only pg_cron, which runs as postgres, and other SECURITY DEFINER functions call
-- them — those run as the owner, so they keep working): anon AND authenticated revoked.
--   battle_tick(), ensure_daily_battle(date)
--
-- Moderator-only (check is_moderator() inside; always called by a signed-in moderator):
--   admin_list_battles, admin_battle_entries, admin_schedule_battle, admin_cancel_battle,
--   admin_remove_battle_entry
--
-- Signed-in writes (all already refuse auth.uid() IS NULL; the app always creates a session
-- first via ensureWriteSession(), and anonymous-auth sessions use the `authenticated` role):
--   claim_battle_award, vote_caption_battle_entry, start_game_session, submit_arcade_score,
--   rate_game, submit_takedown_request
--
-- Deliberately KEPT for anon:
--   * public reads: get_battle_state, get_daily_caption_battle, get_caption_hall_of_fame,
--     get_active_caption_kings, get_creator_profile, get_weekly_leaderboards, get_year_in_memes,
--     get_game_leaderboard, get_game_ratings, get_meme_evolution_tree, get_active_bounty,
--     get_hot_feed, meme_public_state (api/meme-og.js), pulse (anonymous analytics)
--   * evaluated as the visitor inside RLS policies / the security_invoker memes_feed_view:
--     is_moderator, is_suspended, is_house_user, get_meme_upvotes_last_hour
-- ============================================================================

revoke execute on function public.battle_tick() from anon, authenticated;
revoke execute on function public.ensure_daily_battle(date) from anon, authenticated;

revoke execute on function public.admin_list_battles() from anon;
revoke execute on function public.admin_battle_entries(uuid) from anon;
revoke execute on function public.admin_schedule_battle(date, text, text, text, text, text) from anon;
revoke execute on function public.admin_cancel_battle(uuid) from anon;
revoke execute on function public.admin_remove_battle_entry(uuid, text) from anon;

revoke execute on function public.claim_battle_award(uuid) from anon;
revoke execute on function public.vote_caption_battle_entry(uuid, boolean) from anon;
revoke execute on function public.start_game_session(text) from anon;
revoke execute on function public.submit_arcade_score(uuid, text, integer, text) from anon;
revoke execute on function public.rate_game(text, integer) from anon;
revoke execute on function public.submit_takedown_request(text, text, text, text) from anon;
