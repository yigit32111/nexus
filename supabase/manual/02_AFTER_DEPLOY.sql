-- Run ONLY after server-side share and usage logging have been deployed and tested.
begin;
drop policy if exists nexus_shares_public_read on public.nexus_shares;
drop policy if exists nexus_shares_owner_read on public.nexus_shares;
create policy nexus_shares_owner_read on public.nexus_shares for select to authenticated using ((select auth.uid()) = user_id);
revoke select on public.nexus_shares from anon;
drop policy if exists nexus_usage_logs_own_all on public.nexus_usage_logs;
drop policy if exists nexus_usage_logs_owner_read on public.nexus_usage_logs;
create policy nexus_usage_logs_owner_read on public.nexus_usage_logs for select to authenticated using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.nexus_usage_logs from anon, authenticated;
commit;
