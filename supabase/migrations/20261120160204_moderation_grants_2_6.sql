-- Lock down SECURITY DEFINER moderation RPC execute grants
revoke execute on function public.mod_apply_decision_v2(uuid, uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.mod_apply_decision_v2(uuid, uuid, uuid, uuid, text, text, text) to service_role;

revoke execute on function public.admin_get_moderation_settings() from public, anon;
grant execute on function public.admin_get_moderation_settings() to authenticated, service_role;

revoke execute on function public.admin_update_moderation_settings(smallint, text[], boolean) from public, anon;
grant execute on function public.admin_update_moderation_settings(smallint, text[], boolean) to authenticated, service_role;

revoke execute on function public.report_content(text, uuid, uuid, uuid, text, text, text) from public, anon;
grant execute on function public.report_content(text, uuid, uuid, uuid, text, text, text) to authenticated, service_role;
