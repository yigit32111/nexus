import Link from "next/link";
import {notFound} from "next/navigation";
import {BILLING_RELEASE,PRO_OFFER} from "../../lib/core/plans";
import {getCoreAdmin} from "../../lib/core/permissions";
import {createAdminClient} from "../../utils/supabase/admin";
export const dynamic="force-dynamic";
export default async function AdminPage(){
  if(!await getCoreAdmin())notFound();
  const db=createAdminClient();
  const day=new Date().toISOString().slice(0,10);
  const [limits,rows,logs,counts]=await Promise.all([
    db.from("nexus_core_limits").select("*").eq("id",true).single(),
    db.from("nexus_core_daily").select("requests,images,reserved_microusd",{count:"exact"}).eq("day",day).limit(10000),
    db.from("nexus_usage_logs").select("id",{count:"exact",head:true}).gte("created_at",day+"T00:00:00Z"),
    db.rpc("nexus_admin_counts")
  ]);
  if(limits.error||rows.error||logs.error||!limits.data)throw new Error("Yönetim verileri alınamadı");
  const cfg=limits.data;
  const data=rows.data||[];
  const sum=(key:string)=>data.reduce((a,r)=>a+Number((r as Record<string,unknown>)[key]||0),0);
  const usd=(v:number)=>"$"+(v/1e6).toFixed(4);
  return <main style={{maxWidth:850,margin:"auto",padding:24,color:"#e2e8f0",background:"#10151e",minHeight:"100vh",overflowY:"auto"}}>
    <Link href="/" style={{color:"#93c5fd"}}>← NEXUS</Link><h1>NEXUS Admin Center 2.0</h1>
    <p>UTC gün: {day} · Salt okunur yönetim · Rezervasyonlar tahmindir.</p>
    <h2>Kullanıcılar ve kullanım</h2>
    {counts.error || !counts.data ? <p>Göstergeler alınamadı.</p> : <dl className="admin-metrics">
      {Object.entries({
        "Çevrimiçi · son 2 dakika": counts.data.online,
        "Free etiketli hesap (eski metadata)": counts.data.free,
        "Pro etiketli hesap (eski metadata)": counts.data.pro,
        "Toplam token · tüm zamanlar": counts.data.tokens
      }).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{BigInt(String(value)).toLocaleString("tr-TR")}</dd></div>)}
    </dl>}
    <h2>Günlük kota durumu</h2>
    <p>Bugünkü istek: {sum("requests")} / {cfg.global_requests}</p>
    <p>Görsel üretimi: kapalı · geçmiş günlük denemeler: {sum("images")}</p>
    <p>Rezerve bütçe: {usd(sum("reserved_microusd"))} / {usd(Number(cfg.global_budget_microusd))}</p>
    <p>Bugün kota kullanan kullanıcı: {rows.count??data.length}</p>
    <p>Bugünkü kullanım logları: {logs.count??0}</p>
    <p>Genel istek kotası: {sum("requests") >= Number(cfg.global_requests) ? "Doldu" : "Kullanılabilir"}</p>
    <h2>Kullanıcı limitleri</h2><p>İstek: {cfg.user_requests} · Tahmini bütçe: {usd(Number(cfg.user_budget_microusd))}</p>
    <h2>Üyelik ve ödeme durumu</h2><p>Yönetici Pro önizlemesi: açık · diğer hesapların erişimi: Free. Eski hesap etiketleri ücretli erişim sağlamaz.</p><p>Ücretli AI: {BILLING_RELEASE.premiumEnabled?"Açık":"Kapalı"}</p>
    <p>Ödeme: {BILLING_RELEASE.paymentsEnabled?"Açık":"Kapalı"} · hedef {BILLING_RELEASE.targetMajor}.0</p>
    <p>Planlanan Pro: {PRO_OFFER.priceTry} TL/ay · {PRO_OFFER.monthlyBudgetMicrousd/1e6} USD ortak bütçe. Gerçek cüzdan kurulmadı.</p>
    <p>Veritabanındaki eski ücretli kota bayrağı: {cfg.paid_enabled?"Açık":"Kapalı"} (5.0 premium erişim vermez).</p>
    <p>Limitler yetkili Supabase yönetiminden düzenlenir. Görsel üretim sağlayıcısı kaldırıldı. Kota muhasebesi gerçek fatura değildir.</p>
    {(rows.count??0)>data.length&&<p>Uyarı: satır limiti nedeniyle özet eksik.</p>}
  </main>;
}
