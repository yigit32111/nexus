import {parsePrice,type CatalogModel} from "./model-policy.ts";
export const OPENROUTER_BASE="https://openrouter.ai/api/v1";
export function validProviderBase(value:unknown):boolean{
 return typeof value==="string"&&value.replace(/\/+$/,"")===OPENROUTER_BASE;
}
export type FreeCatalogModel=CatalogModel&{name:string};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const strings=(v:unknown):string[]=>Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"):[];
export function parseFreeCatalog(payload:unknown):FreeCatalogModel[]{
 if(!record(payload)||!Array.isArray(payload.data))throw new Error("CORE_CATALOG");
 const result:FreeCatalogModel[]=[];
 const seen=new Set<string>();
 for(const m of payload.data.slice(0,10000)){
  if(!record(m)||typeof m.id!=="string"||m.id.length>180||!m.id.endsWith(":free")||m.id.startsWith("openrouter/")||m.active===false||seen.has(m.id))continue;
  if(!record(m.architecture)||!strings(m.architecture.input_modalities).includes("text")||!strings(m.architecture.output_modalities).includes("text"))continue;
  if(!record(m.pricing)||parsePrice(m.pricing.prompt)!==0||parsePrice(m.pricing.completion)!==0)continue;
  // Fail closed for nonzero or unknown additional pricing fields (including tools/reasoning).
  if(Object.values(m.pricing).some(v=>parsePrice(v)!==0))continue;
  const context=Number(m.context_length);
  if(!Number.isSafeInteger(context)||context<4096)continue;
  seen.add(m.id);
  result.push({id:m.id,name:typeof m.name==="string"?m.name.slice(0,180):m.id,context,vision:strings(m.architecture.input_modalities).includes("image"),prompt:0,completion:0,request:0,image:0,supported:strings(m.supported_parameters)});
 }
 return result;
}
