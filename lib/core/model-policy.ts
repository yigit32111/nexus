export type CatalogModel = {id:string; context:number; vision:boolean; prompt:number; completion:number; request:number; image:number; supported:string[]};
export function isFreeModel(m: CatalogModel) {
  return m.prompt === 0 && m.completion === 0 && m.request === 0 && m.image === 0;
}

export function chooseModel(models:CatalogModel[],requested:string,defaultId:string,query:string,images:number,inputTokens:number) {
  const eligible=models.filter(m=>m.context>=inputTokens+4096&&(!images||m.vision));
  if(requested!=="auto"){
    const exact=eligible.find(m=>m.id===(requested||defaultId));
    if(exact) return exact;
    if(requested) return undefined;
  }
  const code=/\b(code|kod|python|typescript|javascript|programla|debug)\b/i.test(query);
  const reason=/\b(matematik|ispat|denklem|analiz|reasoning|math)\b/i.test(query);
  const score=(m:CatalogModel)=> (images&&m.vision?5:0)+(code&&/coder|code/i.test(m.id)?4:0)+(reason&&/reason|think|deepseek|qwen/i.test(m.id)?3:0)+(m.id===defaultId?1:0)+Math.min(m.context,128000)/128000;
  return eligible.filter(m=>isFreeModel(m)).sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id))[0];
}
export function estimateReservation(m:CatalogModel,inputTokens:number,images:number,web:boolean){
  const total=m.prompt*inputTokens+m.completion*4096+m.request+m.image*images+(web?0.05:0);
  return Math.ceil(total*1.25*1e6);
}
export function parsePrice(v:unknown):number|null{
  if((typeof v!=="number"&&typeof v!=="string")||String(v).trim()==="")return null;
  const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;
}
