-- Money is stored as integer micro-USD (5 USD = 5,000,000).

create table public.nexus_credit_wallets (
 user_id uuid not null references auth.users(id) on delete restrict,
 period_start date not null check (extract(day from period_start)=1),
 budget_microusd bigint not null default 5000000 check (budget_microusd between 0 and 5000000),
 spent_microusd bigint not null default 0 check (spent_microusd>=0),
 reserved_microusd bigint not null default 0 check (reserved_microusd>=0),
 blocked boolean not null default false,
 primary key(user_id,period_start)
);
create table public.nexus_credit_reservations (
 request_id uuid primary key,
 user_id uuid not null,
 period_start date not null,
 amount_microusd bigint not null check(amount_microusd between 1 and 5000000),
 actual_microusd bigint check(actual_microusd between 0 and 100000000),
 created_at timestamptz not null default now(),
 settled_at timestamptz,
 foreign key(user_id,period_start) references public.nexus_credit_wallets(user_id,period_start) on delete restrict,
 check((actual_microusd is null)=(settled_at is null))
);
alter table public.nexus_credit_wallets enable row level security;
alter table public.nexus_credit_reservations enable row level security;
revoke all on public.nexus_credit_wallets,public.nexus_credit_reservations from public,anon,authenticated;
grant select,insert,update on public.nexus_credit_wallets,public.nexus_credit_reservations to service_role;
create function public.nexus_credit_reserve(p_user uuid,p_request uuid,p_amount bigint)
returns boolean language plpgsql security invoker set search_path='' as $$
declare d date:=date_trunc('month',timezone('UTC',now()))::date; w public.nexus_credit_wallets%rowtype; inserted uuid;
begin
 if p_user is null or p_request is null or p_amount is null or p_amount<1 or p_amount>5000000 then return false; end if;
 select * into w from public.nexus_credit_wallets where user_id=p_user and period_start=d for update;
 if not found then return false; end if;
 if w.blocked or w.spent_microusd+w.reserved_microusd+p_amount>w.budget_microusd then return false; end if;
 insert into public.nexus_credit_reservations(request_id,user_id,period_start,amount_microusd)
 values(p_request,p_user,d,p_amount) on conflict(request_id) do nothing returning request_id into inserted;
 if inserted is null then return false; end if;
 update public.nexus_credit_wallets set reserved_microusd=reserved_microusd+p_amount where user_id=p_user and period_start=d;
 return true;
end; $$;
create function public.nexus_credit_settle(p_user uuid,p_request uuid,p_actual bigint)
returns boolean language plpgsql security invoker set search_path='' as $$
declare r public.nexus_credit_reservations%rowtype;
begin
 if p_user is null or p_request is null or p_actual is null or p_actual<0 or p_actual>100000000 then return false; end if;
 select * into r from public.nexus_credit_reservations where user_id=p_user and request_id=p_request;
 if not found then return false; end if;
 perform 1 from public.nexus_credit_wallets where user_id=p_user and period_start=r.period_start for update;
 if not found then return false; end if;
 select * into r from public.nexus_credit_reservations where user_id=p_user and request_id=p_request for update;
 if r.actual_microusd is not null then return r.actual_microusd=p_actual; end if;
 update public.nexus_credit_wallets set reserved_microusd=reserved_microusd-r.amount_microusd,
 spent_microusd=spent_microusd+p_actual,
 blocked=blocked or p_actual>r.amount_microusd
 where user_id=p_user and period_start=r.period_start;
 update public.nexus_credit_reservations set actual_microusd=p_actual,settled_at=now() where request_id=p_request;
 return true;
end; $$;
revoke all on function public.nexus_credit_reserve(uuid,uuid,bigint),public.nexus_credit_settle(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.nexus_credit_reserve(uuid,uuid,bigint),public.nexus_credit_settle(uuid,uuid,bigint) to service_role;
