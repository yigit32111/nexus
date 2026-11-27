import Link from "next/link";
import {notFound} from "next/navigation";
import {BILLING_RELEASE,PRO_OFFER} from "../../lib/core/plans";
import {getCoreAdmin} from "../../lib/core/permissions";
import {createAdminClient} from "../../utils/supabase/admin";
import {NexusLogo} from "../../components/NexusBrand";
import {CostIntelligence} from "../../components/CostIntelligence";
import {utcUsageWindow} from "../../lib/core/cost-intelligence";
export const dynamic="force-dynamic";
export default async function AdminPage(){
  if(!await getCoreAdmin())notFound();
  const db=createAdminClient();
  const now=new Date(),day=now.toISOString().slice(0,10),window=utcUsageWindow(now);
  const [limits,rows,logs,counts,usage]=await Promise.all([
    db.from("nexus_core_limits").select("*").eq("id",true).single(),
    db.from("nexus_core_daily").select("requests,images,reserved_microusd",{count:"exact"}).eq("day",day).limit(10000),
    db.from("nexus_usage_logs").select("id",{count:"exact",head:true}).gte("created_at",day+"T00:00:00Z"),
    db.rpc("nexus_admin_counts"),
    db.from("nexus_usage_logs").select("created_at,model,prompt_tokens,completion_tokens,cost_microusd",{count:"exact"})
      .gte("created_at",window.start).lt("created_at",window.end).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(1000)
  ]);
  if(limits.error||rows.error||logs.error||!limits.data)throw new Error("Yönetim verileri alınamadı");
  const cfg=limits.data,data=rows.data||[];
  const sum=(key:string)=>data.reduce((a,r)=>a+Number((r as Record<string,unknown>)[key]||0),0);
  const usd=(v:number)=>"$"+(v/1e6).toFixed(4);
  const requests=sum("requests"),quota=Number(cfg.global_requests);
  const incomplete=(rows.count??data.length)>data.length;
  const pct=quota>0?Math.max(0,Math.min(100,requests/quota*100)):0;
  return <main className="n51-admin">
    <aside className="n51-nav">
      <Link className="n51-brand" href="/"><NexusLogo size={42}/><div><strong>NEXUS</strong><small>5.1 / ADMIN CENTER</small></div></Link>
      <nav aria-label="Yönetim bölümleri"><a href="#overview">Genel bakış</a><a href="#cost">Kullanım ve maliyet</a><a href="#limits">Kota ve üyelik</a></nav>
      <Link className="n51-back" href="/">← NEXUS sohbet</Link>
    </aside>
    <div className="n51-main">
      <header id="overview" className="n51-header"><span className="n51-kicker">NEXUS · 5.1 ÖNİZLEME</span><h1>Admin Center 3.0</h1><p>UTC gün: {day} · Salt okunur yönetim</p></header>
      {counts.error||!counts.data?<p className="n51-warning">Genel göstergeler alınamadı.</p>:<div className="n51-grid n51-overview">{Object.entries({
        "Çevrimiçi · son 2 dakika":counts.data.online,
        "Free · eski metadata":counts.data.free,
        "Pro · eski metadata":counts.data.pro,
        "Toplam token · tüm zamanlar":counts.data.tokens
      }).map(([label,value])=><div className="n51-card" key={label}><span>{label}</span><strong>{BigInt(String(value)).toLocaleString("tr-TR")}</strong></div>)}</div>}
      {usage.error?<section id="cost" className="n51-card"><h2>Kullanım ve maliyet</h2><p role="status">Kullanım kayıtları alınamadı. Veri yok olarak yorumlanmamalıdır.</p></section>:<CostIntelligence rows={usage.data??[]} exactCount={usage.count} now={now}/>}
      <section id="limits" className="n51-section"><div className="n51-section-head"><h2>Kota ve üyelik</h2></div>
        <div className="n51-grid n51-limits">
          <div className="n51-card"><h3>Günlük kota</h3><strong>{requests} / {quota}</strong><span>{incomplete?"Kısmi istek toplamı":"Bugünkü istek"}</span><div className="n51-progress" aria-hidden="true"><div style={{width:pct+"%"}}/></div>
            <small>{incomplete?"Satır limiti: toplam eksik.":requests>=quota?"Genel istek kotası doldu.":"Genel istek kotası kullanılabilir."}</small>
            <p>Rezerve bütçe: {usd(sum("reserved_microusd"))} / {usd(Number(cfg.global_budget_microusd))}</p>
            <small>Rezervasyonlar tahmindir. {rows.count??data.length} kota kullanan kullanıcı · {logs.count??"—"} kullanım kaydı.</small><small>Görsel üretimi kapalı · geçmiş günlük denemeler: {sum("images")}</small>
          </div>
          <div className="n51-card"><h3>Kullanıcı limitleri</h3><strong>{cfg.user_requests} istek</strong><span>Tahmini bütçe: {usd(Number(cfg.user_budget_microusd))}</span><small>Limitler yetkili Supabase yönetiminden düzenlenir.</small></div>
        </div>
        <div className="n51-card"><h3>Üyelik ve ödeme</h3><p>Yönetici Pro önizlemesi açık · diğer hesaplar Free. Eski hesap etiketleri ücretli erişim sağlamaz.</p><p>Ücretli AI: {BILLING_RELEASE.premiumEnabled?"Açık":"Kapalı"} · Ödeme: {BILLING_RELEASE.paymentsEnabled?"Açık":"Kapalı"} · hedef {BILLING_RELEASE.targetMajor}.0</p><p>Planlanan Pro: {PRO_OFFER.priceTry} TL/ay · {PRO_OFFER.monthlyBudgetMicrousd/1e6} USD ortak bütçe. Sadece önizleme; gerçek ödeme yok.</p><small>Eski ücretli kota bayrağı: {cfg.paid_enabled?"Açık":"Kapalı"} (premium erişim vermez). Kota muhasebesi gerçek fatura değildir.</small></div>
      </section>
    </div>
  </main>;
}
