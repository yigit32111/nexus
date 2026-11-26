import "server-only";
import {chooseModel,estimateReservation,isFreeModel,parsePrice,type CatalogModel} from "./model-policy";
let catalog:{expires:number; models:CatalogModel[]}|undefined;
let loading:Promise<void>|undefined;
export async function routeModel(args:{base:string;key:string;requested:string;defaultId:string;query:string;images:number;inputTokens:number;web:boolean;freeOnly?:boolean;exclude?:string}){
  if(new URL(args.base).origin!=="https://openrouter.ai")throw new Error("CORE_PROVIDER");
  if(!catalog||catalog.expires<Date.now()){
    if(!loading)loading=(async()=>{
    const r=await fetch("https://openrouter.ai/api/v1/models",{headers:{Authorization:`Bearer ${args.key}`},cache:"no-store",signal:AbortSignal.timeout(12000)});
    if(!r.ok)throw new Error("CORE_CATALOG");
    const payload=await r.json();
    if(!Array.isArray(payload.data))throw new Error("CORE_CATALOG");
    const models:CatalogModel[]=[];
    for(const m of payload.data){
      if(typeof m.id!=="string"||m.id.startsWith("openrouter/")||m.active===false||!m.architecture?.output_modalities?.includes("text")||!m.architecture?.input_modalities?.includes("text"))continue;
      const prompt=parsePrice(m.pricing?.prompt),completion=parsePrice(m.pricing?.completion),request=parsePrice(m.pricing?.request??"0"),image=parsePrice(m.pricing?.image??"0");
      const context=Number(m.context_length);
      if(prompt===null||completion===null||request===null||image===null||!Number.isSafeInteger(context)||context<=0)continue;
      models.push({id:m.id,context,vision:m.architecture.input_modalities.includes("image"),prompt,completion,request,image,supported:Array.isArray(m.supported_parameters)?m.supported_parameters:[]});
    }
    catalog={models,expires:Date.now()+120000};
    })().finally(()=>{loading=undefined});
    await loading;
  }
  if(!catalog)throw new Error("CORE_CATALOG");
  const model=chooseModel(catalog.models.filter(m => m.id !== args.exclude && (!args.freeOnly || isFreeModel(m))),args.requested,args.defaultId,args.query,args.images,args.inputTokens);
  if(!model)throw new Error("CORE_MODEL");
  return {model,reserve:estimateReservation(model,args.inputTokens,args.images,args.web),maxPrice:{prompt:model.prompt*1e6,completion:model.completion*1e6,request:model.request,image:model.image}};
}
