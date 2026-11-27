create table public.nexus_presence (user_id uuid primary key references auth.users(id) on delete cascade, seen_at timestamptz not null default now());
alter table public.nexus_presence enable row level security;
revoke all on public.nexus_presence from public, anon, authenticated;
create function public.nexus_touch_presence() returns void language sql security definer set search_path='' as $$
 insert into public.nexus_presence(user_id) values(auth.uid()) on conflict(user_id) do update set seen_at=now() where public.nexus_presence.seen_at < now()-interval '20 seconds';
$$;
revoke all on function public.nexus_touch_presence() from public,anon;
grant execute on function public.nexus_touch_presence() to authenticated;
create function public.nexus_admin_counts() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('online',(select count(*) from public.nexus_presence where seen_at >= now()-interval '2 minutes'),
 'pro',count(*) filter(where raw_app_meta_data->>'plan'='pro'),
 'free',count(*) filter(where raw_app_meta_data->>'plan' is distinct from 'pro'),
 'tokens',(select coalesce(sum(coalesce(prompt_tokens,0)::bigint+coalesce(completion_tokens,0)),0)::text from public.nexus_usage_logs))
 from auth.users where deleted_at is null;
$$;
revoke all on function public.nexus_admin_counts() from public,anon,authenticated;
grant execute on function public.nexus_admin_counts() to service_role;
