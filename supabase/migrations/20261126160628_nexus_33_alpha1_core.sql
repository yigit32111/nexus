begin;
create table public.nexus_core_limits (
 id boolean primary key default true check(id),
 user_requests integer not null default 50 check(user_requests between 1 and 10000),
 global_requests integer not null default 500 check(global_requests between 1 and 100000),
 user_images integer not null default 5 check(user_images between 0 and 1000),
 global_images integer not null default 30 check(global_images between 0 and 10000),
 user_budget_microusd bigint not null default 250000 check(user_budget_microusd between 0 and 100000000),
 global_budget_microusd bigint not null default 2000000 check(global_budget_microusd between 0 and 1000000000),
 paid_enabled boolean not null default false
);
insert into public.nexus_core_limits(id) values(true);
create table public.nexus_core_daily (
 day date not null, user_id uuid not null references auth.users(id) on delete restrict,
 requests integer not null default 0, images integer not null default 0, reserved_microusd bigint not null default 0,
 primary key(day,user_id), check(requests>=0 and images>=0 and reserved_microusd>=0)
);
create index nexus_core_daily_user_idx on public.nexus_core_daily(user_id);
create table public.nexus_core_admin_audit (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null, action text not null, details jsonb not null, created_at timestamptz not null default now()
);
alter table public.nexus_core_limits enable row level security;
alter table public.nexus_core_daily enable row level security;
alter table public.nexus_core_admin_audit enable row level security;
revoke all on public.nexus_core_limits,public.nexus_core_daily,public.nexus_core_admin_audit from public,anon,authenticated;
grant select,update on public.nexus_core_limits to service_role;
grant select,insert,update on public.nexus_core_daily to service_role;
grant select,insert on public.nexus_core_admin_audit to service_role;
alter table public.nexus_usage_logs add column if not exists cost_microusd bigint check(cost_microusd>=0);
grant select on public.nexus_usage_logs to service_role;
create or replace function public.nexus_reserve_request(p_user uuid,p_feature text,p_cost bigint)
returns boolean language plpgsql security invoker set search_path='' as $$
declare
 cfg public.nexus_core_limits%rowtype; d date := (transaction_timestamp() at time zone 'UTC')::date;
 own_req bigint; own_img bigint; own_cost bigint; all_req bigint; all_img bigint; all_cost bigint; img integer;
begin
 if p_user is null or p_feature not in ('chat','image') or p_cost is null or p_cost<0 or p_cost>100000000 then return false; end if;
 img := case when p_feature='image' then 1 else 0 end;
 select * into cfg from public.nexus_core_limits where id=true for update;
 if not found then return false; end if;
 if p_cost>0 and not cfg.paid_enabled then return false; end if;
 select coalesce(sum(requests),0),coalesce(sum(images),0),coalesce(sum(reserved_microusd),0),
 coalesce(sum(requests) filter(where user_id=p_user),0),coalesce(sum(images) filter(where user_id=p_user),0),coalesce(sum(reserved_microusd) filter(where user_id=p_user),0)
 into all_req,all_img,all_cost,own_req,own_img,own_cost from public.nexus_core_daily where day=d;
 if own_req>=cfg.user_requests or all_req>=cfg.global_requests or own_img+img>cfg.user_images or all_img+img>cfg.global_images or own_cost+p_cost>cfg.user_budget_microusd or all_cost+p_cost>cfg.global_budget_microusd then return false; end if;
 insert into public.nexus_core_daily(day,user_id,requests,images,reserved_microusd) values(d,p_user,1,img,p_cost)
 on conflict(day,user_id) do update set requests=public.nexus_core_daily.requests+1,images=public.nexus_core_daily.images+excluded.images,reserved_microusd=public.nexus_core_daily.reserved_microusd+excluded.reserved_microusd;
 return true;
end; $$;
revoke all on function public.nexus_reserve_request(uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.nexus_reserve_request(uuid,text,bigint) to service_role;
commit;
