-- Provider invoices and one-off orders are distinct grants. All money is integer micro-USD.
create table public.nexus_billing_subscriptions(
 id text primary key, user_id uuid not null references auth.users, status text not null,
 offer text not null, updated_at timestamptz not null, ends_at timestamptz
);
create table public.nexus_billing_grants(
 source text primary key, user_id uuid not null references auth.users, subscription text references public.nexus_billing_subscriptions,
 starts_at timestamptz not null, ends_at timestamptz, amount bigint not null check(amount>=0),
 spent bigint not null default 0, held bigint not null default 0, refunded boolean not null default false
);
create index on public.nexus_billing_grants(user_id,ends_at);
create index on public.nexus_billing_subscriptions(user_id);
create table public.nexus_billing_holds(
 id uuid primary key, user_id uuid not null references auth.users, model text not null, created_at timestamptz not null default now(),
 amount bigint not null check(amount>0), actual bigint check(actual>=0)
);
create table public.nexus_billing_parts(
 request_id uuid references public.nexus_billing_holds, source text references public.nexus_billing_grants,
 amount bigint not null check(amount>0), primary key(request_id,source)
);
alter table public.nexus_billing_subscriptions enable row level security;
alter table public.nexus_billing_grants enable row level security;
alter table public.nexus_billing_holds enable row level security;
alter table public.nexus_billing_parts enable row level security;
revoke all on public.nexus_billing_subscriptions,public.nexus_billing_grants,public.nexus_billing_holds,public.nexus_billing_parts from public,anon,authenticated;
grant select,insert,update on public.nexus_billing_subscriptions,public.nexus_billing_grants,public.nexus_billing_holds,public.nexus_billing_parts to service_role;

create function public.nexus_billing_balance(p_user uuid) returns jsonb language sql stable set search_path=public as $$
 with valid as (
 select g.* from nexus_billing_grants g left join nexus_billing_subscriptions s on s.id=g.subscription
 where g.user_id=p_user and not g.refunded and g.starts_at<=now() and (g.ends_at is null or g.ends_at>now()) and
 (g.subscription is null or (s.status in ('active','cancelled') and (s.ends_at is null or s.ends_at>now()))))
 select jsonb_build_object('pro',count(*) filter(where subscription is not null)>0,
 'monthly',coalesce(sum(greatest(0,amount-held-spent)) filter(where subscription is not null),0),
 'extra',coalesce(sum(greatest(0,amount-held-spent)) filter(where subscription is null),0),
 'pending',(select coalesce(sum(amount),0) from nexus_billing_holds where user_id=p_user and actual is null)) from valid
$$;

create function public.nexus_billing_reserve(p_user uuid,p_request uuid,p_model text,p_amount bigint,p_extra boolean)
returns boolean language plpgsql set search_path=public as $$
declare b jsonb; grant_row record; stale record; remaining bigint:=p_amount; portion bigint;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 for stale in select id from nexus_billing_holds where user_id=p_user and actual is null and created_at<now()-interval '24 hours' loop
 perform nexus_billing_settle(stale.id,0);
 end loop;
 b:=nexus_billing_balance(p_user);
 if p_amount is null or p_amount not between 1 and 5000000 or not (b->>'pro')::boolean
 or (b->>'monthly')::bigint + (case when p_extra then (b->>'extra')::bigint else 0 end) < p_amount then return false; end if;
 if not public.nexus_reserve_request(p_user,'chat',p_amount) then return false; end if;
 insert into nexus_billing_holds(id,user_id,model,amount) values(p_request,p_user,p_model,p_amount);
 for grant_row in select g.* from nexus_billing_grants g left join nexus_billing_subscriptions s on s.id=g.subscription
 where g.user_id=p_user and not g.refunded and g.starts_at<=now() and coalesce(g.ends_at,'infinity')>now()
 and ((p_extra and g.subscription is null) or (s.status in ('active','cancelled') and coalesce(s.ends_at,'infinity')>now()))
 order by g.ends_at asc nulls last,g.source for update of g loop
 portion:=least(remaining,greatest(0,grant_row.amount-grant_row.held-grant_row.spent));
 if portion>0 then
 insert into nexus_billing_parts values(p_request,grant_row.source,portion);
 update nexus_billing_grants set held=held+portion where source=grant_row.source;
 remaining:=remaining-portion;
 end if;
 exit when remaining=0;
 end loop;
 if remaining<>0 then raise exception 'reservation changed'; end if;
 return true;
end $$;

create function public.nexus_billing_settle(p_request uuid,p_actual bigint)
returns void language plpgsql set search_path=public as $$
declare h nexus_billing_holds%rowtype; part record; remaining bigint:=p_actual; used bigint;
begin
 select * into strict h from nexus_billing_holds where id=p_request for update;
 if h.actual is not null then
 if h.actual<>p_actual then raise exception 'settlement conflict'; end if;
 return;
 end if;
 if p_actual is null or p_actual<0 then raise exception 'invalid usage'; end if;
 for part in select p.* from nexus_billing_parts p join nexus_billing_grants g using(source)
 where request_id=p_request order by g.ends_at asc nulls last,g.source loop
 used:=least(remaining,part.amount);
 update nexus_billing_grants set held=held-part.amount,spent=spent+used where source=part.source;
 remaining:=remaining-used;
 end loop;
 -- Record upstream cost in full. The customer pays at most the authorized reservation.
 update nexus_billing_holds set actual=p_actual where id=p_request;
end $$;
revoke all on function public.nexus_billing_balance(uuid),public.nexus_billing_reserve(uuid,uuid,text,bigint,boolean),public.nexus_billing_settle(uuid,bigint) from public,anon,authenticated;
grant execute on function public.nexus_billing_balance(uuid),public.nexus_billing_reserve(uuid,uuid,text,bigint,boolean),public.nexus_billing_settle(uuid,bigint) to service_role;

create function public.nexus_billing_subscription(p_id text,p_user uuid,p_offer text,p_status text,p_updated timestamptz,p_end timestamptz)
returns void language sql set search_path=public as $$
 insert into nexus_billing_subscriptions values(p_id,p_user,p_status,p_offer,p_updated,p_end)
 on conflict(id) do update set status=excluded.status,offer=excluded.offer,updated_at=excluded.updated_at,ends_at=excluded.ends_at
 where nexus_billing_subscriptions.user_id=excluded.user_id and nexus_billing_subscriptions.updated_at<=excluded.updated_at
$$;
create function public.nexus_billing_grant(p_source text,p_user uuid,p_sub text,p_start timestamptz,p_amount bigint,p_refund boolean)
returns void language plpgsql set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 insert into nexus_billing_grants(source,user_id,subscription,starts_at,ends_at,amount,refunded)
 values(p_source,p_user,p_sub,p_start,case when p_sub is not null then p_start+interval '1 month' end,p_amount,p_refund)
 on conflict(source) do update set refunded=nexus_billing_grants.refunded or excluded.refunded,
 amount=least(nexus_billing_grants.amount,excluded.amount)
 where nexus_billing_grants.user_id=excluded.user_id;
end $$;
revoke all on function public.nexus_billing_subscription(text,uuid,text,text,timestamptz,timestamptz),public.nexus_billing_grant(text,uuid,text,timestamptz,bigint,boolean) from public,anon,authenticated;
grant execute on function public.nexus_billing_subscription(text,uuid,text,text,timestamptz,timestamptz),public.nexus_billing_grant(text,uuid,text,timestamptz,bigint,boolean) to service_role;


create table public.nexus_billing_environment(id boolean primary key default true check(id),mode text not null check(mode in('test','live')));
create table public.nexus_billing_checkouts(user_id uuid primary key references auth.users,token uuid not null,expires_at timestamptz not null);
alter table public.nexus_billing_environment enable row level security;
alter table public.nexus_billing_checkouts enable row level security;
revoke all on public.nexus_billing_environment,public.nexus_billing_checkouts from public,anon,authenticated;
grant select,insert on public.nexus_billing_environment to service_role;
grant select,insert,update,delete on public.nexus_billing_checkouts to service_role;
create function public.nexus_billing_mode(p_mode text) returns boolean language plpgsql set search_path=public as $$
begin
 insert into nexus_billing_environment(mode) values(p_mode) on conflict(id) do nothing;
 return exists(select 1 from nexus_billing_environment where mode=p_mode);
end $$;
create function public.nexus_billing_checkout_lock(p_user uuid,p_token uuid) returns boolean language plpgsql set search_path=public as $$
begin
 insert into nexus_billing_checkouts values(p_user,p_token,now()+interval '16 minutes')
 on conflict(user_id) do update set token=excluded.token,expires_at=excluded.expires_at where nexus_billing_checkouts.expires_at<now();
 return found;
end $$;
revoke all on function public.nexus_billing_mode(text),public.nexus_billing_checkout_lock(uuid,uuid) from public,anon,authenticated;
grant execute on function public.nexus_billing_mode(text),public.nexus_billing_checkout_lock(uuid,uuid) to service_role;

create or replace function public.nexus_admin_counts() returns jsonb language sql stable security definer set search_path='' as $$
 with paying as (
 select distinct g.user_id from public.nexus_billing_grants g join public.nexus_billing_subscriptions s on s.id=g.subscription
 where not g.refunded and g.starts_at<=now() and g.ends_at>now() and s.status in('active','cancelled') and coalesce(s.ends_at,'infinity')>now())
 select jsonb_build_object('online',(select count(*) from public.nexus_presence where seen_at>=now()-interval '2 minutes'),
 'pro',count(p.user_id),'free',count(*)-count(p.user_id),
 'tokens',(select coalesce(sum(coalesce(prompt_tokens,0)::bigint+coalesce(completion_tokens,0)),0)::text from public.nexus_usage_logs))
 from auth.users u left join paying p on p.user_id=u.id where u.deleted_at is null
$$;
revoke all on function public.nexus_admin_counts() from public,anon,authenticated;
grant execute on function public.nexus_admin_counts() to service_role;
