export type JsonResult={ok:true;value:any}|{ok:false;status:number;error:string};
export async function readJsonLimited(req:Request,maxBytes:number):Promise<JsonResult>{
 const reject=(status:number,error:string):JsonResult=>({ok:false,status,error});
 if((req.headers.get("content-type")||"").split(";")[0].trim().toLowerCase()!=="application/json")return reject(415,"JSON içerik türü gerekli.");
 const site=req.headers.get("sec-fetch-site");
 if(site&&site!=="same-origin"&&site!=="none")return reject(403,"Siteler arası istek reddedildi.");
 const declared=req.headers.get("content-length");
 if(declared&&Number(declared)>maxBytes)return reject(413,"İstek boyutu sınırı aşıldı.");
 if(!req.body)return reject(400,"İstek içeriği eksik.");
 const reader=req.body.getReader(),decoder=new TextDecoder("utf-8",{fatal:true});
 let size=0,text="";
 try{
  while(true){const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;if(size>maxBytes){await reader.cancel().catch(()=>{});return reject(413,"İstek boyutu sınırı aşıldı.");}
   text+=decoder.decode(value,{stream:true});
  }
  text+=decoder.decode();const value=JSON.parse(text);
  if(!value||typeof value!=="object"||Array.isArray(value))return reject(400,"Geçersiz JSON nesnesi.");
  return {ok:true,value};
 }catch{return reject(400,"İstek okunamadı.");}finally{reader.releaseLock();}
}
export function boundedHistory<T>(messages:T[]):T[]{return messages.slice(-50)}
