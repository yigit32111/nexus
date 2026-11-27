import { randomUUID } from "node:crypto";

// Fixed codes only. Never accept an Error, request, user object, URL or message.
const CODES = ["CHAT_INTERNAL","CHAT_TIMEOUT","CHAT_PROVIDER_FAILURE","USAGE_LOG_FAILURE","NEXT_SERVER_ERROR","MONITOR_TEST"] as const;
export type TechnicalEvent = typeof CODES[number];
export function sentryEndpoint(raw: unknown): URL | null {
  if (typeof raw !== "string" || raw.length > 512 || raw !== raw.trim()) return null;
  try {
    const dsn = new URL(raw);
    if (dsn.protocol !== "https:" || dsn.port || dsn.password || dsn.search || dsn.hash ||
        !/^(?:o[0-9]+\.)?ingest(?:\.(?:us|de))?\.sentry\.io$/.test(dsn.hostname) ||
        !/^[a-f0-9]{32}$/i.test(dsn.username) || !/^\/[1-9][0-9]{0,19}\/?$/.test(dsn.pathname)) return null;
    const endpoint = new URL("/api/"+dsn.pathname.split("/")[1]+"/envelope/",dsn.origin);
    endpoint.searchParams.set("sentry_key",dsn.username);
    return endpoint;
  } catch { return null; }
}
export function technicalEnvelope(code: unknown, now: number): string | null {
  if (typeof code !== "string" || !CODES.includes(code as TechnicalEvent) || !Number.isFinite(now)) return null;
  const event_id=randomUUID().replace(/-/g,"");
  return [
    JSON.stringify({event_id,sent_at:new Date(now).toISOString()}),
    JSON.stringify({type:"event"}),
    JSON.stringify({event_id,timestamp:now/1000,platform:"javascript",level:"error",
      logger:"nexus.technical",environment:"production",release:"nexus@5.0.0-rc.1",
      message:"NEXUS "+code,fingerprint:["nexus",code],tags:{component:code}})
  ].join("\n")+"\n";
}
export function createTechnicalReporter({dsn,send=fetch,clock=Date.now}:{
  dsn:()=>string|undefined;send?:typeof fetch;clock?:()=>number;
}) {
  const last=new Map<TechnicalEvent,number>();
  let pauseUntil=0;
  return async function report(code:TechnicalEvent):Promise<boolean> {
    try {
      const now=clock();
      const endpoint=sentryEndpoint(dsn());
      const body=technicalEnvelope(code,now);
      if (!endpoint || !body || now<pauseUntil || now-(last.get(code)??-Infinity)<60_000) return false;
      last.set(code,now);
      const result=await send(endpoint,{method:"POST",headers:{"Content-Type":"application/x-sentry-envelope"},
        body,redirect:"error",cache:"no-store",signal:AbortSignal.timeout(1500)});
      if(result.status===429){
        const value=result.headers.get("retry-after");
        const seconds=value && /^\d{1,6}$/.test(value)?Number(value):60;
        pauseUntil=clock()+Math.max(60,Math.min(86400,seconds))*1000;
      }
      const accepted=result.ok;
      await result.body?.cancel().catch(()=>{});
      return accepted;
    } catch { return false; }
  };
}
