begin;
drop policy if exists nexus_usage_logs_own_all on public.nexus_usage_logs;
drop policy if exists nexus_usage_logs_owner_read on public.nexus_usage_logs;
create policy nexus_usage_logs_owner_read on public.nexus_usage_logs for select to authenticated using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.nexus_usage_logs from public, anon, authenticated;
grant select on public.nexus_usage_logs to authenticated;
grant insert on public.nexus_usage_logs to service_role;
commit;
