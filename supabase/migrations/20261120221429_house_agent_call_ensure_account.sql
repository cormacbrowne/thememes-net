-- Workstream 1 — allow the one-off `ensure_account` task (creates/repairs the MemeBot house
-- account inside the Edge Function, which already holds the service-role key):
--   select public.house_agent_call('ensure_account');
create or replace function public.house_agent_call(p_task text, p_dry_run boolean default false)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  if p_task not in ('daily_memes', 'seed_battle', 'weekly_bounty', 'ensure_account') then
    raise exception 'unknown task %', p_task;
  end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'house_agent_secret' limit 1;
  if v_secret is null then
    raise warning 'house_agent_secret missing from Vault; % not called', p_task;
    return null;
  end if;
  return net.http_post(
    url := 'https://otvvphmjojqyjaznjzyo.supabase.co/functions/v1/house-agent',
    body := jsonb_build_object('task', p_task, 'dry_run', coalesce(p_dry_run, false)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 150000
  );
end;
$$;
revoke all on function public.house_agent_call(text, boolean) from public, anon, authenticated;
grant execute on function public.house_agent_call(text, boolean) to service_role;
