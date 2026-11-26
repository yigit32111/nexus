import Link from "next/link";
import {notFound} from "next/navigation";
import {getCoreAdmin} from "../../lib/core/permissions";
import {createAdminClient} from "../../utils/supabase/admin";
export const dynamic="force-dynamic";
export default async function AdminPage(){
  if(!await getCoreAdmin())notFound();
  const db=createAdminClient();
  const day=new Date().toISOString().slice(0,10);
  const [limits,rows,logs]=await Promise.all([
    db.from("nexus_core_limits").select("*").eq("id",true).single(),
    db.from("nexus_core_daily").select("requests,images,reserved_microusd",{count:"exact"}).eq("day",day).limit(10000),
    db.from("nexus_usage_logs").select("id",{count:"exact",head:true}).gte("created_at",day+"T00:00:00Z")
  ]);
  if(limits.error||rows.error||logs.error||!limits.data)throw new Error("Yönetim verileri alınamadı");
  const cfg=limits.data;
  const data=rows.data||[];
  const sum=(key:string)=>data.reduce((a,r)=>a+Number((r as Record<string,unknown>)[key]||0),0);
  const usd=(v:number)=>"$"+(v/1e6).toFixed(4);
  return <main style={{maxWidth:850,margin:"auto",padding:24,color:"#e2e8f0",background:"#10151e",minHeight:"100vh",overflowY:"auto"}}>
    <Link href="/" style={{color:"#93c5fd"}}>← NEXUS</Link><h1>NEXUS Control Center</h1>
    <p>UTC gün: {day} · Salt okunur yönetim · Rezervasyonlar tahmindir.</p>
    <p>Bugünkü istek: {sum("requests")} / {cfg.global_requests}</p>
    <p>Görsel denemesi: {sum("images")} / {cfg.global_images}</p>
    <p>Rezerve bütçe: {usd(sum("reserved_microusd"))} / {usd(Number(cfg.global_budget_microusd))}</p>
    <p>Bugün kota kullanan kullanıcı: {rows.count??data.length}</p>
    <p>Bugünkü kullanım logları: {logs.count??0}</p>
    <h2>Kullanıcı limitleri</h2><p>İstek: {cfg.user_requests} · Görsel denemesi: {cfg.user_images} · Tahmini bütçe: {usd(Number(cfg.user_budget_microusd))}</p>
    <p>Ücretli AI: {cfg.paid_enabled?"Açık":"Kapalı"}</p>
    <p>Limitler yetkili Supabase yönetiminden düzenlenir. Görsel sağlayıcı masrafları ayrı izlenir. Kota muhasebesi gerçek fatura değildir.</p>
    {(rows.count??0)>data.length&&<p>Uyarı: satır limiti nedeniyle özet eksik.</p>}
  </main>;
}
