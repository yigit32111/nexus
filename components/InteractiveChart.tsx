"use client";
import {useState} from "react";
import {parseChart} from "../lib/workspace/intelligence";
export function InteractiveChart({raw}:{raw:string}){
 const [sorted,setSorted]=useState(false);const [percent,setPercent]=useState(false);
 const c=parseChart(raw);if(!c)return <pre style={{whiteSpace:"pre-wrap"}}>{raw}</pre>;
 const rows=sorted?[...c.bars].sort((a,b)=>b.value-a.value):c.bars;const total=rows.reduce((a,b)=>a+b.value,0);const max=Math.max(1,...rows.map(r=>r.value));
 return <section className="nx-tool-card"><h3>{c.title}</h3><div className="nx-tool-row"><button onClick={()=>setSorted(v=>!v)}>{sorted?"Özgün sıra":"Değere göre sırala"}</button><button onClick={()=>setPercent(v=>!v)}>{percent?"Sayı":"Yüzde"}</button></div>{rows.map((b,i)=><div key={i} style={{margin:"10px 0"}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><span>{b.label}</span><b>{percent?((total?100*b.value/total:0).toFixed(1)+"%"):b.value.toLocaleString("tr-TR")}</b></div><div style={{height:8,background:"#354154",borderRadius:5}}><div style={{height:8,background:"#818cf8",borderRadius:5,width:(b.value/max*100)+"%"}}/></div></div>)}</section>;
}
