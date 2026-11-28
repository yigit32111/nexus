import {PRO_MODELS} from "../core/plans.ts";
import {parsePrice,type CatalogModel} from "../core/model-policy.ts";

export function premiumCatalog(entries:unknown, allow: readonly string[]=PRO_MODELS): (CatalogModel & {name:string})[] {
  if(!Array.isArray(entries)) return [];
  return entries.flatMap(m=>{
    if(!m || !allow.includes(m.id) || m.active===false ||
       !m.architecture?.input_modalities?.includes("text") || !m.architecture?.output_modalities?.includes("text") ||
       !Number.isSafeInteger(m.context_length) || m.context_length<4096) return [];
    const p=m.pricing, prompt=parsePrice(p?.prompt), completion=parsePrice(p?.completion);
    if(prompt===null || completion===null || prompt<=0 || completion<=0) return [];
    if(Object.entries(p).some(([k,v])=>!["prompt","completion","input_cache_read","input_cache_write"].includes(k)&&parsePrice(v)!==0)) return [];
    if(["input_cache_read","input_cache_write"].some(k=>p[k]!=null && (parsePrice(p[k])??Infinity)>prompt)) return [];
    return [{id:m.id,name:String(m.name||m.id),context:m.context_length,vision:false,prompt,completion,request:0,image:0,supported:Array.isArray(m.supported_parameters)?m.supported_parameters:[]}];
  });
}
