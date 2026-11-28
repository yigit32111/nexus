import {NextResponse} from "next/server";
import {createClient} from "../../../utils/supabase/server";
import {getFreeCatalog} from "../../../lib/core/model-router";
import {OPENROUTER_BASE,validProviderBase} from "../../../lib/core/free-catalog";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return NextResponse.json({error:"Model listesini görmek için giriş yapmalısın."},{status:401});
  const base=process.env.AI_BASE_URL||OPENROUTER_BASE;
  const key=process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY;
  if(!key||!validProviderBase(base))return NextResponse.json({models:[],total:0,configured:false,provider:"OPENROUTER",note:"Ücretsiz OpenRouter bağlantısı yapılandırılmamış."},{headers:{"Cache-Control":"private, no-store"}});
  const models=(await getFreeCatalog(base,key)).map(m=>({id:m.id,name:m.name,description:"Ücretsiz OpenRouter modeli",contextLength:m.context,free:true,vision:m.vision,supportedParameters:m.supported})).sort((a,b)=>Number(b.vision)-Number(a.vision)||a.name.localeCompare(b.name));
  return NextResponse.json({models,total:models.length,configured:true,provider:"OPENROUTER",updatedAt:new Date().toISOString()},{headers:{"Cache-Control":"private, no-store"}});
 }catch{
  return NextResponse.json({error:"Ücretsiz model kataloğu alınamadı."},{status:502});
 }
}
