-- ============================================================================
-- Workstream 1 — shared secret for the house-agent Edge Function (no schedule here).
--
-- The secret lives ONLY in Supabase Vault (`house_agent_secret`), generated here at random, so
-- nobody has to copy it anywhere and it is never in the repo:
--   * pg_cron / the SQL helper below read it from Vault and send it as the bearer token;
--   * the function checks the bearer with house_agent_check_secret() (service role only).
--
-- Dry run from the SQL editor (returns a pg_net request id; read the reply a few seconds later):
--   select public.house_agent_call('daily_memes', true);
--   select status_code, content::jsonb from net._http_response where id = <that id>;
-- ============================================================================

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'house_agent_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'house_agent_secret',
      'Bearer token for the house-agent Edge Function (pg_cron → function)'
    );
  end if;
end;
$$;

create or replace function public.house_agent_check_secret(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(length(p_token) >= 32 and p_token = (
    select decrypted_secret from vault.decrypted_secrets where name = 'house_agent_secret' limit 1
  ), false);
$$;
revoke all on function public.house_agent_check_secret(text) from public, anon, authenticated;
grant execute on function public.house_agent_check_secret(text) to service_role;

create or replace function public.house_agent_call(p_task text, p_dry_run boolean default false)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  if p_task not in ('daily_memes', 'seed_battle', 'weekly_bounty') then
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
