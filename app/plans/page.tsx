import Link from "next/link";
import type {Metadata} from "next";
import {PRO_OFFER} from "../../lib/core/plans";
import "./plans.css";

export const metadata:Metadata={title:"NEXUS — Üyelik planları",description:"Free ve planlanan Pro üyelik seçenekleri."};

export default function PlansPage(){
 const budget=PRO_OFFER.monthlyBudgetMicrousd/1_000_000;
 return <main className="plans-page">
  <div className="plans-inner">
   <header className="plans-top"><Link href="/" className="plans-brand">NEXUS<span>AI</span></Link><Link href="/">Sohbete dön</Link></header>
   <section className="plans-hero">
    <p className="plans-kicker">NEXUS 5.1 · ÖNİZLEME</p>
    <h1>Üyelik planları</h1>
    <p>İhtiyaçlarına uygun yapay zekâ deneyimini keşfet.</p>
    <div className="plans-notice" role="note">Bu sayfa tasarım önizlemesidir. NEXUS 10.0'a kadar gerçek ödeme alınmayacak; premium erişim kapalıdır.</div>
   </section>
   <section className="plans-grid" aria-label="Paket karşılaştırması">
    <article className="plans-card">
     <h2>Free</h2><p>Günlük kullanım ve temel araçlar.</p>
     <div className="plans-price">0 TL <span>/ ay</span></div>
     <ul><li>NEXUS Auto 3.0</li><li>Uygun ücretsiz modeller</li><li>Standart hafıza ve çalışma alanı</li><li>Mevcut ücretsiz kullanım kotaları</li></ul>
     <Link className="plans-action plans-secondary" href="/">Ücretsiz kullan</Link>
    </article>
    <article className="plans-card plans-pro">
     <div className="plans-tag">PLANLANAN PAKET</div>
     <h2>Pro</h2><p>Premium modeller ve ortak API bütçesi.</p>
     <div className="plans-price">{PRO_OFFER.priceTry} TL <span>/ ay · önerilen</span></div>
     <ul><li>Free özellikleri</li><li>GPT-5.6 Luna (planlanan)</li><li>Claude Haiku 5.5 (planlanan)</li><li>Aylık {budget} USD ortak API bütçesi</li><li>Bütçe tükendiğinde ücretsiz Auto</li></ul>
     <a className="plans-action plans-primary" href="#odeme-onizleme">Ödeme önizlemesini gör</a>
    </article>
   </section>
   <section id="odeme-onizleme" className="plans-checkout" aria-labelledby="checkout-title">
    <div><p className="plans-kicker">DEMO · İŞLEM YAPILMAZ</p><h2 id="checkout-title">Ödeme özeti</h2><p>Gerçek ödeme bilgileri bu ekranda istenmez. Bu özet bir sipariş veya ödeme taahhüdü değildir.</p></div>
    <dl><div><dt>Planlanan paket</dt><dd>NEXUS Pro</dd></div><div><dt>Önerilen dönem</dt><dd>Aylık</dd></div><div><dt>Ortak model bütçesi</dt><dd>{budget} USD</dd></div><div className="plans-total"><dt>Önerilen abonelik fiyatı</dt><dd>{PRO_OFFER.priceTry} TL</dd></div></dl>
    <p className="plans-note">Nihai fiyat, vergiler ve abonelik koşulları ödeme altyapısı kurulduğunda belirlenecek.</p>
    <button type="button" className="plans-action plans-disabled" disabled>Ödeme kapalı — NEXUS 10.0</button>
    <small>Kart bilgisi, fatura bilgisi ve ödeme verisi toplanmaz.</small>
   </section>
  </div>
 </main>
}
