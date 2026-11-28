import Link from "next/link";
import {BillingButton} from "../../components/ProPaymentPreview";
import {createAdminClient} from "../../utils/supabase/admin";
import {balance,configured} from "../../lib/billing/server";
import {offers,offerIds} from "../../lib/billing/offers";
import {createClient} from "../../utils/supabase/server";
import "./plans.css";

export const dynamic="force-dynamic";
export const metadata={title:"NEXUS — Üyelik planları"};
const dollars=(n:number)=>(n/1e6).toLocaleString("tr-TR",{maximumFractionDigits:4});
export default async function PlansPage(){
 const enabled=configured();
 const user=enabled?(await (await createClient()).auth.getUser()).data.user:null;
 const wallet=user?await balance(user.id):null;
 const recent=user?await createAdminClient().from("nexus_billing_holds").select("id,model,created_at,amount,actual").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10):null;
 return <main className="plans-page"><div className="plans-inner">
  <header className="plans-top"><Link href="/" className="plans-brand">NEXUS<span>AI</span></Link><Link href="/">Sohbete dön</Link></header>
  <section className="plans-hero"><h1>Üyelik planları</h1>
    <p>Auto ücretsiz modelleri kullanır. Pro ile seçili ücretli modelleri açabilirsin.</p>
    {!enabled && <p role="status">Ödemeler henüz açılmadı.</p>}
    {enabled && process.env.NEXUS_BILLING_MODE==="test" && <p>Test ortamı · Gerçek tahsilat ve ücretli model çağrıları kapalı.</p>}
  </section>
  {wallet && <section className="plans-notice"><h2>Hesabım</h2><p>Aylık kalan {dollars(wallet.monthly)} USD · Ek bakiye {dollars(wallet.extra)} USD · Bekleyen kullanım {dollars(wallet.pending)} USD</p>
    <BillingButton offer="portal" enabled={enabled} label="Aboneliği, faturaları ve iptali yönet"/>
    {!!recent?.data?.length && <details><summary>Son ücretli kullanımlar</summary><ul>{recent.data.map(row=><li key={row.id}>{new Date(row.created_at).toLocaleDateString("tr-TR",{timeZone:"Europe/Istanbul"})} · {row.model} · {row.actual===null?"Bekliyor":dollars(Math.min(row.amount,row.actual))+" USD"}</li>)}</ul></details>}</section>}
  <section className="plans-grid"><article className="plans-card"><h2>Free</h2><p className="plans-price">0 TL</p><p>Günlük kota dahilinde NEXUS Auto ve çalışma alanı.</p><Link href="/" className="plans-action plans-secondary">Auto ile sohbet et</Link></article>
  {offerIds.map(id=>{const o=offers[id];const extra=id==="extra";return <article className="plans-card" key={id}><h2>{o.name}</h2>
    <p className="plans-price">{o.price} TL <span>{extra?"tek sefer":"/ ay"}</span></p>
    <p>{dollars(o.allowance)} USD model kullanım hakkı. {extra?"Etkin üyelikte, yalnızca seçtiğinde kullanılır.":"Aylık otomatik yenilenir. Dönem sonunda kullanılmayan aylık hak sona erer."}</p>
    <BillingButton offer={id} enabled={enabled && (extra?Boolean(wallet?.pro):!wallet?.pro)} label={extra?"Ek kredi al":"Abone ol"}/>
  </article>})}</section>
  <p>Ücretli modellerde giriş ve yanıt uzunluğu harcanan bakiyeyi belirler. Auto, Pro bakiyesini kullanmaz.</p>
 </div></main>;
}
