// Read-only reporting; usage records are not a financial ledger.
export type UsageRecord={created_at:unknown;model:unknown;prompt_tokens:unknown;completion_tokens:unknown;cost_microusd:unknown};
type Bucket={records:number;input:bigint;output:bigint;knownCost:bigint;known:number;unknown:number;invalidTokens:number};
const blank=():Bucket=>({records:0,input:BigInt(0),output:BigInt(0),knownCost:BigInt(0),known:0,unknown:0,invalidTokens:0});
const integer=(v:unknown):bigint|null=>{
  if(typeof v==="number"&&Number.isSafeInteger(v)&&v>=0)return BigInt(v);
  if(typeof v==="string"&&/^(0|[1-9][0-9]{0,18})$/.test(v))return BigInt(v);
  return null;
};
export function utcUsageWindow(now:Date){
  const end=new Date(now);end.setUTCHours(0,0,0,0);end.setUTCDate(end.getUTCDate()+1);
  const start=new Date(end);start.setUTCDate(start.getUTCDate()-7);
  const days=Array.from({length:7},(_,i)=>new Date(start.getTime()+i*86400000).toISOString().slice(0,10));
  return {start:start.toISOString(),end:end.toISOString(),days};
}
function add(b:Bucket,r:UsageRecord){
  b.records++;
  const input=integer(r.prompt_tokens),output=integer(r.completion_tokens),cost=integer(r.cost_microusd);
  if(input===null||output===null)b.invalidTokens++;
  b.input+=input??BigInt(0);b.output+=output??BigInt(0);
  if(cost===null)b.unknown++;else{b.known++;b.knownCost+=cost;}
}
export function summarizeUsage(rows:readonly UsageRecord[],now:Date,exactCount:number|null){
  const window=utcUsageWindow(now),total=blank(),days=new Map(window.days.map(day=>[day,blank()])),models=new Map<string,Bucket>();
  let ignored=0;
  for(const r of rows){
    const date=typeof r.created_at==="string"?Date.parse(r.created_at):NaN;
    if(!Number.isFinite(date)||date<Date.parse(window.start)||date>=Date.parse(window.end)){ignored++;continue;}
    const day=new Date(date).toISOString().slice(0,10);
    const key=typeof r.model==="string"&&r.model.trim()?r.model.slice(0,160):"Bilinmeyen model";
    const b=models.get(key)??blank();models.set(key,b);
    add(total,r);add(days.get(day)!,r);add(b,r);
  }
  return {window,total,ignored,partial:exactCount===null||exactCount!==rows.length||ignored>0,
    days:[...days].map(([day,b])=>({day,...b})),
    models:[...models].map(([model,b])=>({model,...b})).sort((a,b)=>{
      const x=a.input+a.output,y=b.input+b.output;return x===y?a.model.localeCompare(b.model):x>y?-1:1;
    })};
}
export function formatMicrousd(value:bigint):string{
  const n=value<BigInt(0)?BigInt(0):value;return "$"+(n/BigInt(1000000)).toString()+"."+(n%BigInt(1000000)).toString().padStart(6,"0");
}
export function proportionalPercent(value:bigint,max:bigint):number{
  if(max<=BigInt(0)||value<=BigInt(0))return 0;
  return Number((value>=max?max:value)*BigInt(10000)/max)/100;
}
