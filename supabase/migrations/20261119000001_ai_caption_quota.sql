-- AI Caption Writer: free-use quota for the `ai-caption` Edge Function.
--
-- Limits (change them here, in public.ai_caption_limits()):
--   * signed-in accounts (not anonymous): 25 AI captions per calendar month (UTC)
--   * anonymous visitors:                  3 per calendar month, AND at most 3 per day per IP hash
--                                          (so clearing cookies does not reset the allowance)
--   * whole site:                          2000 per day (cost safety net, ~£0.60/day at nano prices)
--
-- One row per successful claim. A failed generation is refunded (the row is deleted), so people
-- are only charged for captions they actually received. No prompt text is stored.
-- Only the service role (the Edge Function) can touch any of this.

create table if not exists public.ai_caption_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  ip_hash text,
  is_anonymous boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists ai_caption_usage_user_idx on public.ai_caption_usage (user_id, created_at desc);
create index if not exists ai_caption_usage_ip_idx on public.ai_caption_usage (ip_hash, created_at desc) where ip_hash is not null;
create index if not exists ai_caption_usage_created_idx on public.ai_caption_usage (created_at desc);

alter table public.ai_caption_usage enable row level security;
revoke all on table public.ai_caption_usage from public, anon, authenticated;

create or replace function public.ai_caption_limits()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'account_monthly', 25,
    'anon_monthly', 3,
    'anon_ip_daily', 3,
    'site_daily', 2000
  );
$$;

revoke all on function public.ai_caption_limits() from public, anon, authenticated;

-- Shared quota maths. p_claim = true records a use when one is available.
create or replace function public.ai_caption_quota(p_user_id uuid, p_ip_hash text, p_claim boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limits jsonb := public.ai_caption_limits();
  v_anon boolean;
  v_ip text := nullif(btrim(coalesce(p_ip_hash, '')), '');
  v_month_start timestamptz := date_trunc('month', now() at time zone 'utc') at time zone 'utc';
  v_day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  v_limit integer;
  v_used integer;
  v_ip_used integer := 0;
  v_site_used integer;
  v_id bigint;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;

  select coalesce(u.is_anonymous, false) into v_anon from auth.users u where u.id = p_user_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'sign_in_required');
  end if;

  -- Serialise claims per user so two quick taps cannot both take the last free use.
  if p_claim then
    perform pg_advisory_xact_lock(hashtextextended('ai_caption:' || p_user_id::text, 0));
    if v_anon and v_ip is not null then
      perform pg_advisory_xact_lock(hashtextextended('ai_caption_ip:' || v_ip, 0));
    end if;
  end if;

  v_limit := case when v_anon then (v_limits->>'anon_monthly')::int else (v_limits->>'account_monthly')::int end;

  select count(*) into v_used
  from public.ai_caption_usage
  where user_id = p_user_id and created_at >= v_month_start;

  if v_anon and v_ip is not null then
    select count(*) into v_ip_used
    from public.ai_caption_usage
    where ip_hash = v_ip and is_anonymous and created_at >= v_day_start;
  end if;

  select count(*) into v_site_used from public.ai_caption_usage where created_at >= v_day_start;

  if not p_claim then
    return jsonb_build_object(
      'ok', true,
      'tier', case when v_anon then 'anonymous' else 'account' end,
      'limit', v_limit,
      'used', v_used,
      'remaining', greatest(0, v_limit - v_used),
      'resets_at', (v_month_start + interval '1 month')
    );
  end if;

  if v_site_used >= (v_limits->>'site_daily')::int then
    return jsonb_build_object('ok', false, 'error', 'ai_busy');
  end if;

  if v_used >= v_limit
     or (v_anon and v_ip_used >= (v_limits->>'anon_ip_daily')::int) then
    return jsonb_build_object(
      'ok', false,
      'error', 'ai_quota_used',
      'tier', case when v_anon then 'anonymous' else 'account' end,
      'limit', v_limit,
      'used', v_used,
      'remaining', 0,
      'resets_at', (v_month_start + interval '1 month')
    );
  end if;

  insert into public.ai_caption_usage (user_id, ip_hash, is_anonymous)
  values (p_user_id, v_ip, v_anon)
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'usage_id', v_id,
    'tier', case when v_anon then 'anonymous' else 'account' end,
    'limit', v_limit,
    'used', v_used + 1,
    'remaining', greatest(0, v_limit - v_used - 1),
    'resets_at', (v_month_start + interval '1 month')
  );
end;
$$;

revoke all on function public.ai_caption_quota(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.ai_caption_quota(uuid, text, boolean) to service_role;

-- Give a use back when generation failed or every caption was blocked by moderation.
create or replace function public.ai_caption_refund(p_usage_id bigint, p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.ai_caption_usage where id = p_usage_id and user_id = p_user_id;
$$;

revoke all on function public.ai_caption_refund(bigint, uuid) from public, anon, authenticated;
grant execute on function public.ai_caption_refund(bigint, uuid) to service_role;
