-- ============================================================================
-- Migration 20261115000012 — Phase 33 task 33.12
-- Reconcile live DB RPCs with current schema:
--   * Fix `public.get_meme_evolution_tree(target_meme_id)` which previously
--     referenced a nonexistent `m.upvotes` column (throwing 42703 at runtime),
--     joined `public.profiles` without SECURITY DEFINER, and lacked an
--     `approved` status filter.
-- ============================================================================

create or replace function public.get_meme_evolution_tree(target_meme_id uuid)
returns table (
  id uuid,
  title text,
  image_url text,
  user_id uuid,
  username text,
  parent_meme_id uuid,
  generation integer,
  upvotes integer,
  mutation_count integer,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_root_id uuid;
begin
  select coalesce(m.root_meme_id, m.id) into v_root_id
  from public.memes m
  where m.id = target_meme_id
    and m.status = 'approved';

  if v_root_id is null then
    return;
  end if;

  return query
  with recursive lineage as (
    select
      m.id,
      m.title,
      m.image_url,
      m.user_id,
      coalesce(p.username, m.author_name, 'AnonMemer') as username,
      m.parent_meme_id,
      m.generation,
      coalesce(m.score, 0) as upvotes,
      m.mutation_count,
      m.created_at
    from public.memes m
    left join public.profiles p on p.id = m.user_id
    where m.id = v_root_id
      and m.status = 'approved'

    union all

    select
      child.id,
      child.title,
      child.image_url,
      child.user_id,
      coalesce(p.username, child.author_name, 'AnonMemer') as username,
      child.parent_meme_id,
      child.generation,
      coalesce(child.score, 0) as upvotes,
      child.mutation_count,
      child.created_at
    from public.memes child
    inner join lineage parent on child.parent_meme_id = parent.id
    left join public.profiles p on p.id = child.user_id
    where child.status = 'approved'
  )
  select * from lineage
  order by generation asc, upvotes desc;
end;
$$;

revoke all on function public.get_meme_evolution_tree(uuid) from public;
grant execute on function public.get_meme_evolution_tree(uuid) to anon, authenticated, service_role;
