begin;
drop policy if exists nexus_shares_public_read on public.nexus_shares;
drop policy if exists nexus_shares_owner_read on public.nexus_shares;
create policy nexus_shares_owner_read on public.nexus_shares for select to authenticated using ((select auth.uid()) = user_id);
revoke select on public.nexus_shares from anon;
commit;
