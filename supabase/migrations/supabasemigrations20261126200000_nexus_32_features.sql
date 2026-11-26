-- NEXUS AI 3.2 — Gems RAG Bilgi Bankası, Herkese Açık Paylaşım ve Kullanım Analitiği

-- 1) Gems Bilgi Bankası Doküman Parçaları (RAG)
create table if not exists public.nexus_gem_docs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  gem_id text not null,
  file_name text not null,
  chunk_index integer not null default 0,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists nexus_gem_docs_user_gem_idx
  on public.nexus_gem_docs(user_id, gem_id);

alter table public.nexus_gem_docs enable row level security;

create policy "nexus_gem_docs_own_all" on public.nexus_gem_docs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.nexus_gem_docs to authenticated;

-- 2) Herkese Açık Paylaşım Bağlantıları (/share/[id])
create table if not exists public.nexus_shares (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  share_type text not null default 'canvas',
  language text not null default 'markdown',
  content text not null default '',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.nexus_shares enable row level security;

create policy "nexus_shares_public_read" on public.nexus_shares
  for select to anon, authenticated
  using (true);

create policy "nexus_shares_owner_write" on public.nexus_shares
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "nexus_shares_owner_delete" on public.nexus_shares
  for delete to authenticated
  using (auth.uid() = user_id);

grant select on public.nexus_shares to anon, authenticated;
grant insert, delete on public.nexus_shares to authenticated;

-- 3) Kullanım ve Token Analitiği Logları
create table if not exists public.nexus_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null,
  provider text not null,
  feature text not null default 'chat',
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists nexus_usage_logs_user_idx
  on public.nexus_usage_logs(user_id, created_at desc);

alter table public.nexus_usage_logs enable row level security;

create policy "nexus_usage_logs_own_all" on public.nexus_usage_logs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert on public.nexus_usage_logs to authenticated;