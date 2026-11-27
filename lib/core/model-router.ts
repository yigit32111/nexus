import "server-only";
import {chooseModel,estimateReservation} from "./model-policy";
import {OPENROUTER_BASE,parseFreeCatalog,validProviderBase,type FreeCatalogModel} from "./free-catalog";
let catalog:{expires:number;models:FreeCatalogModel[]}|undefined;
let loading:Promise<void>|undefined;
export async function getFreeCatalog(base:string,key:string){
 if(!validProviderBase(base))throw new Error("CORE_PROVIDER");
 if(!catalog||catalog.expires<Date.now()){
  if(!loading)loading=(async()=>{
   const r=await fetch(OPENROUTER_BASE+"/models",{headers:{Authorization:`Bearer ${key}`},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000)});
   if(!r.ok)throw new Error("CORE_CATALOG");
   catalog={models:parseFreeCatalog(await r.json()),expires:Date.now()+120000};
  })().finally(()=>{loading=undefined});
  await loading;
 }
 if(!catalog)throw new Error("CORE_CATALOG");
 return catalog.models;
}
export async function routeModel(args:{base:string;key:string;requested:string;defaultId:string;query:string;images:number;inputTokens:number;web:boolean;freeOnly?:boolean;exclude?:string}){
 if(args.web)throw new Error("CORE_PAID_DISABLED");
 const catalog=await getFreeCatalog(args.base,args.key);
 const model=chooseModel(catalog.filter(m=>m.id!==args.exclude),args.requested,args.defaultId,args.query,args.images,args.inputTokens);
 if(!model)throw new Error("CORE_MODEL");
 return {model,reserve:estimateReservation(model,args.inputTokens,args.images,false),maxPrice:{prompt:0,completion:0,request:0,image:0}};
}
