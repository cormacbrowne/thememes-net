-- ============================================================================
-- Workstream 1 — schedule the house agents (apply ONLY after the dry runs look right).
--
-- Each job calls public.house_agent_call(task) (see 20261120220148_house_agent_secret.sql), which POSTs
-- {task} to the house-agent Edge Function with the bearer secret read from Vault.
--
-- pg_cron runs in UTC. Times below are the UK *winter* (GMT) times; during BST every job
-- fires one hour later in UK clock time (08:15 UTC = 09:15 BST). The function works out the
-- slot from the Europe/London clock (same zone as battle_settings.timezone), so the BST
-- shift never double-posts or skips a slot.
--
--   house-memes        08:15, 13:15, 18:15 UTC     daily_memes (≈ memes_per_day / 3 each)
--   house-seed-battle  every 10 min                seed_battle (no-op once a battle is seeded)
--   house-bounty       Monday 09:15 UTC            weekly_bounty
--
-- Kill switch: update public.agent_settings set enabled = false;  (or the /admin/house page)
-- ============================================================================

do $$
declare
  j text;
begin
  foreach j in array array['house-memes', 'house-seed-battle', 'house-bounty'] loop
    if exists (select 1 from cron.job where jobname = j) then
      perform cron.unschedule(j);
    end if;
  end loop;
  perform cron.schedule('house-memes', '15 8,13,18 * * *', $c$select public.house_agent_call('daily_memes');$c$);
  perform cron.schedule('house-seed-battle', '*/10 * * * *', $c$select public.house_agent_call('seed_battle');$c$);
  perform cron.schedule('house-bounty', '15 9 * * 1', $c$select public.house_agent_call('weekly_bounty');$c$);
end;
$$;
