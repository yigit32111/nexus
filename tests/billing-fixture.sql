-- Additional columns/tables from the production schema needed by the billing migration.
alter table auth.users add column deleted_at timestamptz;
create table public.nexus_presence(seen_at timestamptz);
create table public.nexus_usage_logs(prompt_tokens integer,completion_tokens integer);
