begin;
create table public.nexus_projects (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 100),
 instructions text not null default '' check(char_length(instructions)<=4000),
 notes text not null default '' check(char_length(notes)<=20000),
 created_at timestamptz not null default now(), unique(id,user_id)
);
alter table public.nexus_projects enable row level security;
revoke all on public.nexus_projects from public,anon,authenticated;
grant select,insert,update,delete on public.nexus_projects to authenticated;
create policy nexus_projects_owner on public.nexus_projects for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index nexus_projects_owner_idx on public.nexus_projects(user_id);
alter table public.nexus_chats add column project_id uuid;
alter table public.nexus_chats add constraint nexus_chat_project_owner foreign key(project_id,user_id) references public.nexus_projects(id,user_id) on delete set null(project_id);
create index nexus_chats_project_idx on public.nexus_chats(project_id,user_id);
commit;
