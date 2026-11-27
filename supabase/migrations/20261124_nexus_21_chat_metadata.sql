-- NEXUS 2.1: sohbet sabitleme ve arşiv durumu
-- Supabase SQL Editor'de bir kez çalıştırın.
alter table public.nexus_chats
  add column if not exists pinned boolean not null default false,
  add column if not exists archived boolean not null default false;
