-- Plan 2.1: Hall of Fame shows each winner's real battle image (v2 battles can use uploaded
-- images, not only templates) and keeps battles ticking when it is the first page opened.
create or replace function public.get_caption_hall_of_fame(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yesterday date := (timezone('utc', now())::date) - 1;
  v_lim integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_rows jsonb;
  v_kings jsonb;
begin
  perform public.finalize_caption_battle_day(v_yesterday);
  perform public.battle_tick();

  select coalesce(jsonb_agg(jsonb_build_object(
      'battle_date', q.battle_date, 'battle_id', q.battle_id, 'entry_id', q.entry_id, 'user_id', q.user_id,
      'author_name', q.author_name, 'template_id', q.template_id, 'image_url', q.image_url,
      'top_text', q.top_text, 'bottom_text', q.bottom_text, 'winning_score', q.winning_score,
      'crowned_until', q.crowned_until, 'created_at', q.created_at
    ) order by q.battle_date desc), '[]'::jsonb)
  into v_rows
  from (
    select w.* from public.caption_battle_winners w order by w.battle_date desc limit v_lim
  ) q;

  select coalesce(jsonb_agg(jsonb_build_object(
      'battle_date', w.battle_date, 'user_id', w.user_id, 'author_name', w.author_name, 'crowned_until', w.crowned_until
    )), '[]'::jsonb)
  into v_kings
  from public.caption_battle_winners w
  where w.crowned_until > now();

  return jsonb_build_object('ok', true, 'winners', v_rows, 'active_kings', v_kings);
end;
$$;
revoke all on function public.get_caption_hall_of_fame(integer) from public;
grant execute on function public.get_caption_hall_of_fame(integer) to anon, authenticated, service_role;
