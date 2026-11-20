-- Workstream 1 — lock down function grants. Supabase's default privileges grant EXECUTE on new
-- public functions to anon/authenticated directly, so `revoke ... from public` is not enough.
-- (close_battle was already anon-callable before this workstream: anyone could end a live
-- battle early through /rest/v1/rpc/close_battle.)
revoke execute on function public.close_battle(uuid) from anon, authenticated;
revoke execute on function public.close_due_bounties() from anon, authenticated;
revoke execute on function public.activate_bounty(text) from anon, authenticated;
revoke execute on function public.admin_get_agent_settings() from anon;
revoke execute on function public.admin_update_agent_settings(jsonb) from anon;
revoke execute on function public.admin_house_queue() from anon;
revoke execute on function public.admin_house_decide(text, text, boolean) from anon;
revoke execute on function public.claim_bounty_award(text) from anon;
revoke execute on function public.is_admin() from anon;
