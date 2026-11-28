import {createAdminClient} from "../../../../utils/supabase/admin";
import {configured,matches,variant,checkEnvironment} from "../../../../lib/billing/server";
import {offerIds,offers} from "../../../../lib/billing/offers";

export async function POST(req:Request) {
  if (!configured()) return new Response(null,{status:503});
  const signature=req.headers.get("x-signature");
  if(!signature || !/^[a-f0-9]{64}$/.test(signature)) return new Response(null,{status:403});
  const reader=req.body?.getReader();
  if(!reader) return new Response(null,{status:400});
  const chunks:Uint8Array[]=[];
  let size=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done) break;
      size+=value.length;
      if(size>256_000){await reader.cancel();return new Response(null,{status:413});}
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const raw=Buffer.concat(chunks).toString("utf8");
  if (!matches(raw,signature)) return new Response(null,{status:403});
  try {
    const {data,meta} = JSON.parse(raw);
    const a=data.attributes, store=process.env.LEMON_STORE_ID!;
    if (String(a.store_id)!==store || a.test_mode!==(process.env.NEXUS_BILLING_MODE==="test")) return new Response(null,{status:403});
    await checkEnvironment();
    const db=createAdminClient();
    const event=meta.event_name;
    let sku=offerIds.find(k=>variant(k)===String(a.variant_id ?? a.first_order_item?.variant_id));
    let user=meta.custom_data?.account;
    const proofValid=sku && typeof user==="string" && matches(["checkout",store,user,sku].join("|"),meta.custom_data?.proof);
    const ok=()=>new Response(null,{status:204});
    if (data.type==="subscriptions" && event.startsWith("subscription_")) {
      if(!sku || sku==="extra") return ok();
      if (!proofValid) {
        const {data:prior,error}=await db.from("nexus_billing_subscriptions").select("user_id").eq("id",data.id).maybeSingle();
        if(error || !prior) throw new Error("Subscription binding pending");
        user=prior.user_id;
      }
      const {error}=await db.rpc("nexus_billing_subscription",{p_id:String(data.id),p_user:user,p_offer:sku,p_status:a.status,p_updated:a.updated_at,p_end:a.ends_at || a.renews_at});
      if(error) throw error;
      return ok();
    }
    const invoice=data.type==="subscription-invoices" && ["subscription_payment_success","subscription_payment_refunded","subscription_payment_recovered"].includes(event);
    const topup=data.type==="orders" && sku==="extra" && ["order_created","order_refunded"].includes(event);
    if (!invoice && !topup) return ok();
    if (invoice) {
      const {data:sub,error}=await db.from("nexus_billing_subscriptions").select("user_id,offer").eq("id",String(a.subscription_id)).maybeSingle();
      if(error || !sub) throw new Error("Subscription event pending");
      sku=offerIds.find(k=>k===sub.offer);
      user=sub.user_id;
      if (!["initial","renewal"].includes(a.billing_reason)) return ok();
    } else if (!proofValid) return new Response(null,{status:403});
    if (!sku || a.currency!=="TRY") return ok();
    const refund=event.endsWith("refunded") || a.refunded===true;
    if(!refund && a.status!=="paid") return ok();
    const offer=offers[sku];
    if(!Number.isSafeInteger(a.total) || a.total < offer.price*100) return ok();
    const returned=Number(a.refunded_amount ?? 0);
    const allowance=refund && returned>0 ? Math.floor(offer.allowance*Math.max(0,1-returned/a.total)) : offer.allowance;
    const {error}=await db.rpc("nexus_billing_grant",{p_source:data.type+"/"+data.id,p_user:user,
      p_sub:invoice?String(a.subscription_id):null,p_start:a.created_at,p_amount:allowance,
      p_refund:refund && (returned===0 || returned>=a.total)});
    if(error) throw error;
    return ok();
  } catch {return new Response(null,{status:503});}
}
