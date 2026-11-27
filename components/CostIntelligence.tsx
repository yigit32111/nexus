import {formatMicrousd,proportionalPercent,summarizeUsage} from "../lib/core/cost-intelligence";
import type {UsageRecord} from "../lib/core/cost-intelligence";
const number=(value:bigint|number)=>value.toLocaleString("tr-TR");
export function CostIntelligence({rows,exactCount,now}:{rows:UsageRecord[];exactCount:number|null;now:Date}){
  const report=summarizeUsage(rows,now,exactCount),t=report.total;
  const max=report.days.reduce((m,d)=>d.input+d.output>m?d.input+d.output:m,BigInt(0));
  return <section id="cost" aria-labelledby="cost-heading" className="n51-section">
    <div className="n51-section-head"><div><span className="n51-kicker">COST INTELLIGENCE</span><h2 id="cost-heading">Kullanım ve maliyet</h2></div><span className="n51-period">{report.window.days[0]} – {report.window.days[6]} · UTC</span></div>
    <p className="n51-note">Son 7 UTC takvim günü, bugün dahil. Token değerleri sağlayıcı sayımı veya tahmin olabilir. Bunlar kullanım kayıtlarıdır, fatura değildir.</p>
    {report.partial&&<p role="status" className="n51-warning">Veri kısmi: {number(t.records)} kayıt işlendi{exactCount===null?"":` / ${number(exactCount)} kayıt`}. Gösterilen değerler tam dönem toplamı değildir.</p>}
    {t.invalidTokens>0&&<p className="n51-warning">{t.invalidTokens} kayıtta eksik/geçersiz token değeri var; yalnızca geçerli değerler toplandı.</p>}
    <div className="n51-grid">
      <div className="n51-card"><span>Kullanım kaydı</span><strong>{number(t.records)}</strong><small>{report.partial?"Kısmi veri":"Son 7 UTC gün"}</small></div>
      <div className="n51-card"><span>Toplam token</span><strong>{number(t.input+t.output)}</strong><small>Girdi {number(t.input)} · Çıktı {number(t.output)}</small></div>
      <div className="n51-card"><span>Bildirilen maliyet</span><strong>{t.known?formatMicrousd(t.knownCost):"—"}</strong><small>Bilinen {t.known} / {t.records} · Bilinmeyen {t.unknown}</small></div>
    </div>
    <div className="n51-card n51-chart"><h3>Günlük token kullanımı</h3>
      {max===BigInt(0)&&<p className="n51-note">Seçili kayıtlarda pozitif token değeri yok.</p>}
      <div className="n51-bars">{report.days.map(d=><div className="n51-bar-item" key={d.day}><span className="n51-bar-value">{number(d.input+d.output)}</span><div className="n51-bar-track" aria-hidden="true"><div style={{height:proportionalPercent(d.input+d.output,max)+"%"}}/></div><span>{d.day.slice(5)}</span></div>)}</div>
      <p className="n51-note">Girdi + çıktı · {report.partial?"Görünen kayıtlar":"Kayıtlı kullanım"}</p>
    </div>
    <div className="n51-card n51-models"><h3>Model bazında dağılım</h3>
      {report.models.length===0?<p className="n51-note">Bu dönemde kayıt yok.</p>:<div className="n51-model-list">{report.models.map(m=><div className="n51-model" key={m.model}><div className="n51-model-name"><strong>{m.model}</strong><small>{number(m.records)} kayıt · {number(m.input+m.output)} token</small></div><div className="n51-model-cost"><strong>{m.known?formatMicrousd(m.knownCost):"—"}</strong><small>{m.known}/{m.records} maliyet biliniyor</small></div></div>)}</div>}
    </div>
  </section>;
}
