\set ON_ERROR_STOP on
insert into public.nexus_credit_wallets(user_id,period_start)
select id,date_trunc('month',timezone('UTC',now()))::date from auth.users where id<>'00000000-0000-4000-8000-000000000003';
do $$
begin
 if has_table_privilege('anon','public.nexus_credit_wallets','SELECT') or has_table_privilege('authenticated','public.nexus_credit_wallets','UPDATE') or has_function_privilege('authenticated','public.nexus_credit_reserve(uuid,uuid,bigint)','EXECUTE') or has_function_privilege('anon','public.nexus_credit_settle(uuid,uuid,bigint)','EXECUTE') then raise exception 'private grant exposed'; end if;
end $$;
set role service_role;
do $$
declare u uuid:='00000000-0000-4000-8000-000000000001'; v uuid:='00000000-0000-4000-8000-000000000002'; no_wallet uuid:='00000000-0000-4000-8000-000000000003'; r uuid:='10000000-0000-4000-8000-000000000001'; r2 uuid:='10000000-0000-4000-8000-000000000002'; w public.nexus_credit_wallets%rowtype;
begin
 if public.nexus_credit_reserve(no_wallet,r,1) then raise exception 'unfunded account accepted'; end if;
 if public.nexus_credit_reserve(u,r,-1) then raise exception 'negative accepted'; end if;
 if not public.nexus_credit_reserve(u,r,4000000) then raise exception 'reserve failed'; end if;
 if public.nexus_credit_reserve(u,r,1) or public.nexus_credit_reserve(v,r,1) then raise exception 'duplicate accepted'; end if;
 if public.nexus_credit_reserve(u,r2,1000001) then raise exception 'overspend accepted'; end if;
 if public.nexus_credit_settle(v,r,1) then raise exception 'wrong owner settlement accepted'; end if;
 if not public.nexus_credit_settle(u,r,3000000) or not public.nexus_credit_settle(u,r,3000000) then raise exception 'settlement failed'; end if;
 if public.nexus_credit_settle(u,r,1) then raise exception 'conflicting settlement accepted'; end if;
 select * into w from public.nexus_credit_wallets where user_id=u;
 if w.spent_microusd<>3000000 or w.reserved_microusd<>0 then raise exception 'incorrect settlement'; end if;
 if not public.nexus_credit_reserve(u,r2,1000000) then raise exception 'released balance unavailable'; end if;
 if not public.nexus_credit_settle(u,r2,1000001) then raise exception 'overage not recorded'; end if;
 if public.nexus_credit_reserve(u,gen_random_uuid(),1) then raise exception 'overage account not blocked'; end if;
 select * into w from public.nexus_credit_wallets where user_id=u;
 if not w.blocked or w.spent_microusd<>4000001 or w.reserved_microusd<>0 then raise exception 'incorrect overage accounting'; end if;
end $$;
reset role;
select 'OK credit ownership, limit, replay, settlement and overage' as result;
