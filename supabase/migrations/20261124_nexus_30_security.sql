-- NEXUS AI 3.0 — kullanıcı verisi ve RLS güvenlik politikaları
-- Supabase SQL Editor'de tek sefer çalıştır.

create table if not exists public.nexus_chats (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Yeni sohbet',
  messages jsonb not null default '[]'::jsonb,
  pinned boolean not null default false,
  archived boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.nexus_chats add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.nexus_chats add column if not exists title text not null default 'Yeni sohbet';
alter table public.nexus_chats add column if not exists messages jsonb not null default '[]'::jsonb;
alter table public.nexus_chats add column if not exists pinned boolean not null default false;
alter table public.nexus_chats add column if not exists archived boolean not null default false;
alter table public.nexus_chats add column if not exists updated_at timestamptz not null default now();

create table if not exists public.nexus_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.nexus_user_settings add column if not exists prefs jsonb not null default '{}'::jsonb;
alter table public.nexus_user_settings add column if not exists updated_at timestamptz not null default now();

create index if not exists nexus_chats_user_updated_idx on public.nexus_chats(user_id, updated_at desc);

alter table public.nexus_chats enable row level security;
alter table public.nexus_user_settings enable row level security;

-- Eski/tekrarlı politikaları temizle. Aksi hâlde permissive politikalar OR ile birleşebilir.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'nexus_chats' loop
    execute format('drop policy if exists %I on public.nexus_chats', p.policyname);
  end loop;
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'nexus_user_settings' loop
    execute format('drop policy if exists %I on public.nexus_user_settings', p.policyname);
  end loop;
end $$;

create policy "nexus_chats_select_own" on public.nexus_chats
  for select to authenticated using (auth.uid() = user_id);
create policy "nexus_chats_insert_own" on public.nexus_chats
  for insert to authenticated with check (auth.uid() = user_id);
create policy "nexus_chats_update_own" on public.nexus_chats
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "nexus_chats_delete_own" on public.nexus_chats
  for delete to authenticated using (auth.uid() = user_id);

create policy "nexus_settings_select_own" on public.nexus_user_settings
  for select to authenticated using (auth.uid() = user_id);
create policy "nexus_settings_insert_own" on public.nexus_user_settings
  for insert to authenticated with check (auth.uid() = user_id);
create policy "nexus_settings_update_own" on public.nexus_user_settings
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "nexus_settings_delete_own" on public.nexus_user_settings
  for delete to authenticated using (auth.uid() = user_id);

grant select, insert, update, delete on public.nexus_chats to authenticated;
grant select, insert, update, delete on public.nexus_user_settings to authenticated;
