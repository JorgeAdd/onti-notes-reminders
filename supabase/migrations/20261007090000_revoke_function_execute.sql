-- Trigger functions are never called directly. Postgres grants EXECUTE on
-- new functions to PUBLIC by default, which exposed handle_new_user()
-- (SECURITY DEFINER) through /rest/v1/rpc. Found by the Supabase security
-- advisor (lints 0028/0029) after the first deploy.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
