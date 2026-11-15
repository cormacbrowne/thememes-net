-- Phase 33.6: Honest accounts, claimed usernames on public.profiles, and server-side ban enforcement

alter table public.profiles
    add column if not exists username text;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'profiles_username_valid_chk'
          and conrelid = 'public.profiles'::regclass
    ) then
        alter table public.profiles
            add constraint profiles_username_valid_chk
            check (
                username is null
                or (
                    char_length(username) between 3 and 20
                    and username ~ '^[A-Za-z0-9_][A-Za-z0-9_.-]{1,18}[A-Za-z0-9_]$'
                    and lower(regexp_replace(username, '[^a-zA-Z0-9]', '', 'g')) not in (
                        'admin', 'administrator', 'mod', 'moderator', 'system',
                        'thememes', 'thememesnet', 'support', 'staff', 'official',
                        'root', 'owner', 'automod', 'anonymous', 'anon', 'null', 'undefined',
                        'anonmemer'
                    )
                )
            );
    end if;
end $$;

create unique index if not exists profiles_username_lower_uidx
    on public.profiles (lower(username))
    where username is not null;

create or replace function public.is_suspended(p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(
        (
            select p.suspended_until is not null and p.suspended_until > now()
            from public.profiles p
            where p.id = p_uid
        ),
        false
    );
$$;

revoke all on function public.is_suspended(uuid) from public;
grant execute on function public.is_suspended(uuid) to anon, authenticated, service_role;

-- Update memes UPDATE RLS policy in place (using ALTER POLICY, not DROP POLICY) so suspended users cannot update their memes
alter policy "Authors can update their own memes"
    on public.memes
    using (
        (select auth.uid()) is not null
        and (select auth.uid()) = user_id
        and not public.is_suspended((select auth.uid()))
    )
    with check (
        (select auth.uid()) is not null
        and (select auth.uid()) = user_id
        and not public.is_suspended((select auth.uid()))
    );

-- Enforce authenticated non-suspended caller on increment_meme_score
create or replace function public.increment_meme_score(row_id uuid, delta integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := auth.uid();
begin
    if v_uid is null then
        raise exception 'authentication_required' using errcode = '42501';
    end if;

    insert into public.profiles (id)
    values (v_uid)
    on conflict (id) do nothing;

    if public.is_suspended(v_uid) then
        raise exception 'account_suspended' using errcode = '42501';
    end if;

    if delta not in (-2, -1, 1, 2) then
        raise exception 'invalid vote delta: %', delta using errcode = '22023';
    end if;

    update public.memes
    set score = greatest(0, coalesce(score, 0) + delta)
    where id = row_id
      and status = 'approved';
end;
$$;

revoke all on function public.increment_meme_score(uuid, integer) from public, anon;
grant execute on function public.increment_meme_score(uuid, integer) to authenticated, service_role;

-- Safe self-profile lookup RPC for the browser
create or replace function public.get_my_profile()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := auth.uid();
    v_row public.profiles%rowtype;
begin
    if v_uid is null then
        return jsonb_build_object('ok', false, 'error', 'unauthorized');
    end if;

    insert into public.profiles (id)
    values (v_uid)
    on conflict (id) do nothing;

    select * into v_row
    from public.profiles
    where id = v_uid;

    return jsonb_build_object(
        'ok', true,
        'id', v_row.id,
        'username', v_row.username,
        'role', v_row.role,
        'strikes', v_row.strikes,
        'suspended_until', v_row.suspended_until
    );
end;
$$;

revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated, service_role;
