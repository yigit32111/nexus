"use client";
import {useState} from "react";
import {parseCalculator,calculate,type Calc} from "../lib/workspace/cards";
function Calculator({spec}:{spec:Calc}){
 const [values,setValues]=useState(spec.inputs.map(x=>x.value));
 const result=calculate(spec.operation,values);
 return <section style={{border:"1px solid var(--line)",borderRadius:9,padding:12,margin:"8px 0"}}><b>{spec.title}</b>{spec.inputs.map((v,i)=><label key={i} style={{display:"block",marginTop:9}}>{v.label}: {values[i]}<input className="range-input" type="range" min={v.min} max={v.max} step={Math.max(.01,(v.max-v.min)/100)} value={values[i]} onChange={e=>setValues(a=>a.map((n,j)=>i===j?Math.max(v.min,Math.min(v.max,Number(e.target.value))):n))}/></label>)}<p><strong>{result===null?"Tanımsız":result.toLocaleString("tr-TR",{maximumFractionDigits:4})+" "+spec.unit}</strong></p><button onClick={()=>setValues(spec.inputs.map(v=>v.value))}>Sıfırla</button></section>
}
export function InteractiveCalculator({raw}:{raw:string}){const spec=parseCalculator(raw);return spec?<Calculator key={raw} spec={spec}/>:<pre style={{whiteSpace:"pre-wrap"}}>{raw}</pre>}
