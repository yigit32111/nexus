import {createClient} from "../../../../utils/supabase/server";
import {createAdminClient} from "../../../../utils/supabase/admin";
import {configured, balance, lemon, signature, variant, checkEnvironment} from "../../../../lib/billing/server";
import {getPremiumCatalog} from "../../../../lib/core/model-router";
import {OPENROUTER_BASE} from "../../../../lib/core/free-catalog";
import {offers, offerIds, type Offer} from "../../../../lib/billing/offers";

export async function POST(req:Request) {
  const site=new URL(process.env.NEXT_PUBLIC_APP_URL || req.url).origin;
  if (req.headers.get("origin") !== site) return new Response(null,{status:403});
  const {data:{user}} = await (await createClient()).auth.getUser();
  if (!user) return Response.json({error:"Önce hesabına giriş yap."},{status:401});
  if (!configured()) return Response.json({error:"Ödeme henüz açılmadı."},{status:503});
  const action = new URL(req.url).searchParams.get("offer") as Offer | "portal";
  try {
    await checkEnvironment();
    const db = createAdminClient();
    const {data:subs,error} = await db.from("nexus_billing_subscriptions").select("id,status").eq("user_id",user.id).order("updated_at",{ascending:false});
    if(error) throw error;
    const sub = subs?.find(s=>!["expired"].includes(s.status));
    if(action === "portal") {
      const id = sub?.id ?? subs?.[0]?.id;
      if (!id) return Response.json({error:"Yönetilecek abonelik bulunamadı."},{status:404});
      const s = await lemon("subscriptions/"+encodeURIComponent(id));
      const portal=new URL(s.attributes.urls.customer_portal);
      portal.search=""; // Provider verifies the billing email before opening its customer portal.
      return Response.json({url:portal.href});
    }
    if (!offerIds.includes(action)) return new Response(null,{status:400});
    if (sub && action !== "extra") return Response.json({error:"Mevcut aboneliğini üyelik panelinden yönet."},{status:409});
    if (action === "extra" && !(await balance(user.id)).pro) return Response.json({error:"Ek kredi için etkin Pro üyeliği gerekir."},{status:403});
    if(process.env.NEXUS_BILLING_MODE==="live"){
      const key=process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY;
      const {data:limits,error}=await db.from("nexus_core_limits").select("paid_enabled").eq("id",true).single();
      if(error || !limits?.paid_enabled || !key || !(await getPremiumCatalog(process.env.AI_BASE_URL || OPENROUTER_BASE,key)).length)
        return Response.json({error:"Ücretli modeller hazır olduğunda ödeme açılacak."},{status:503});
    }
    const store = process.env.LEMON_STORE_ID!, v = variant(action);
    const merchant=await lemon("stores/"+encodeURIComponent(store));
    if(merchant.attributes.currency!=="TRY") return Response.json({error:"Mağazanın TL fiyatlandırması yapılandırılmamış."},{status:503});
    if(action!=="extra"){
      const {data:locked,error:lockError}=await db.rpc("nexus_billing_checkout_lock",{p_user:user.id,p_token:crypto.randomUUID()});
      if(lockError) throw lockError;
      if(!locked) return Response.json({error:"Açık bir ödeme işlemin var. İlk ödeme penceresini kullan veya 16 dakika sonra tekrar dene."},{status:409});
    }
    const result = await lemon("checkouts",{data:{type:"checkouts",attributes:{
      custom_price:offers[action].price*100,
      test_mode:process.env.NEXUS_BILLING_MODE === "test",
      expires_at:new Date(Date.now()+15*60_000).toISOString(),
      product_options:{enabled_variants:[Number(v)],redirect_url:new URL("/plans",site).href},
      checkout_options:{discount:false},
      checkout_data:{email:user.email, custom:{account:user.id,offer:action,proof:signature(["checkout",store,user.id,action].join("|"))}},
    },relationships:{store:{data:{type:"stores",id:store}},variant:{data:{type:"variants",id:v}}}}});
    return Response.json({url:result.attributes.url});
  } catch {return Response.json({error:"Ödeme servisine şu anda ulaşılamıyor."},{status:503});}
}
