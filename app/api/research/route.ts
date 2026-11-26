import {NextRequest,NextResponse} from "next/server";
import {createClient} from "../../../utils/supabase/server";
import {reserveRequest} from "../../../lib/core/budget";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
 try{
  const db=await createClient();const {data:{user},error}=await db.auth.getUser();if(error||!user)return NextResponse.json({error:"Giriş gerekli"},{status:401});
  const body=await req.json().catch(()=>null);const q=typeof body?.query==="string"?body.query.trim():"";
  if(q.length<3||q.length>200)return NextResponse.json({error:"3–200 karakterlik araştırma konusu gir."},{status:400});
  if(!await reserveRequest(user.id,"chat",0))return NextResponse.json({error:"Günlük kota doldu"},{status:429});
  const results=await Promise.allSettled(["tr","en"].map(async lang=>{
   const params=new URLSearchParams({action:"query",generator:"search",gsrsearch:q,gsrlimit:"4",prop:"extracts",exintro:"1",explaintext:"1",exchars:"1000",format:"json",formatversion:"2"});
   const response=await fetch("https://"+lang+".wikipedia.org/w/api.php?"+params,{headers:{"User-Agent":"NEXUS/3.3 (https://nexus-ifn5.onrender.com)"},signal:AbortSignal.timeout(12000),cache:"no-store",redirect:"error"});
   if(!response.ok)throw Error("research source failed");const data=await response.json();
   return (Array.isArray(data?.query?.pages)?data.query.pages:[]).filter((r:any)=>Number.isSafeInteger(r.pageid)&&typeof r.title==="string"&&typeof r.extract==="string"&&r.extract.trim()).map((r:any)=>({title:r.title.slice(0,180),text:r.extract.slice(0,1000),url:"https://"+lang+".wikipedia.org/?curid="+r.pageid,lang}));
  }));
  const sources=results.flatMap(r=>r.status==="fulfilled"?r.value:[]).slice(0,8);
  if(!sources.length)return NextResponse.json({error:"Kaynak bulunamadı veya kaynak servisi yanıt vermedi."},{status:502});
  return NextResponse.json({sources,coverage:"Türkçe ve İngilizce Vikipedi; bağımsız kaynak doğrulaması değildir."},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Araştırma servisine ulaşılamadı."},{status:503})}
}
