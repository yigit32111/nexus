do $$
declare
 u uuid := '00000000-0000-4000-8000-000000000001'; r uuid:=gen_random_uuid();
begin
 if has_function_privilege('authenticated','public.nexus_billing_grant(text,uuid,text,timestamptz,bigint,boolean)','EXECUTE') then raise exception 'grant exposed'; end if;
 if not public.nexus_billing_mode('test') or public.nexus_billing_mode('live') then raise exception 'environment isolation'; end if;
 perform public.nexus_billing_subscription('sample',u,'pro','active',now(),now()+interval '1 month');
 perform public.nexus_billing_grant('invoice/1',u,'sample',now(),800,false);
 perform public.nexus_billing_grant('invoice/1',u,'sample',now(),800,false);
 perform public.nexus_billing_grant('order/2',u,null,now(),1000,false);
 if public.nexus_billing_reserve(u,r,'model',900,false) then raise exception 'extra credit used without consent'; end if;
 if not public.nexus_billing_reserve(u,r,'model',900,true) then raise exception 'combined reservation failed'; end if;
 if public.nexus_billing_reserve(u,gen_random_uuid(),'model',901,true) then raise exception 'overdraft'; end if;
 perform public.nexus_billing_settle(r,820);
 perform public.nexus_billing_settle(r,820);
 if (public.nexus_billing_balance(u)->>'extra')::int<>980 then raise exception 'settlement mismatch'; end if;
 perform public.nexus_billing_grant('invoice/1',u,'sample',now(),800,true);
 perform public.nexus_billing_grant('invoice/1',u,'sample',now(),800,false);
 if (public.nexus_billing_balance(u)->>'pro')::boolean then raise exception 'refunded credit reactivated'; end if;
 if public.nexus_billing_reserve(u,gen_random_uuid(),'model',5,true) then raise exception 'inactive plan accessed paid model'; end if;
end $$;
