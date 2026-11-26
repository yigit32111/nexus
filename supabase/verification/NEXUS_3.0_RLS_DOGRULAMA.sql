-- NEXUS AI 3.0 — RLS doğrulama raporu
-- Supabase SQL Editor'de çalıştır; bu sorgular şemayı değiştirmez.

-- 1) İlgili tablolar mevcut mu ve RLS açık mı?
select
  t.tablename,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_tables t
join pg_class c on c.relname = t.tablename
join pg_namespace n on n.oid = c.relnamespace and n.nspname = t.schemaname
where t.schemaname = 'public'
  and t.tablename in ('nexus_chats', 'nexus_user_settings')
order by t.tablename;

-- 2) Her politikanın gerçek koşulunu incele; yalnızca politika adlarına güvenme.
select
  tablename,
  policyname,
  cmd,
  roles,
  qual as using_expression,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('nexus_chats', 'nexus_user_settings')
order by tablename, cmd, policyname;

-- Beklenen sahiplik koşulu:
-- SELECT/DELETE: USING (auth.uid() = user_id)
-- INSERT: WITH CHECK (auth.uid() = user_id)
-- UPDATE: hem USING hem WITH CHECK (auth.uid() = user_id)
