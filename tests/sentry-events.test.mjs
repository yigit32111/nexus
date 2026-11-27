import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sentryEndpoint,technicalEnvelope,createTechnicalReporter } from "../lib/core/sentry-events.ts";
const key="a".repeat(32),dsn="https://"+key+"@o123.ingest.de.sentry.io/1234";
test("accepts only HTTPS official Sentry ingestion endpoints",()=>{
 assert.equal(sentryEndpoint(dsn).href,"https://o123.ingest.de.sentry.io/api/1234/envelope/?sentry_key="+key);
 for(const bad of [undefined,"",dsn+"?x=1",dsn+"#x",dsn.replace("https:","http:"),dsn.replace("sentry.io","sentry.io.example.com"),dsn.replace("ingest.de.sentry.io","localhost"),dsn.replace("/1234",":8443/1234"),dsn.replace("@",":secret@"),dsn.replace("/1234","/api/1234"),"https://"+key+"@sentry.io/1234"])assert.equal(sentryEndpoint(bad),null);
});
test("fixed event fields, no raw exceptions, request or personal data",()=>{
 const body=technicalEnvelope("CHAT_INTERNAL",1700000000000);
 const [head,item,event]=body.trim().split("\n").map(JSON.parse);
 assert.equal(head.event_id,event.event_id);
 assert.equal(item.type,"event");
 assert.deepEqual(Object.keys(event).sort(),["event_id","timestamp","platform","level","logger","environment","release","message","fingerprint","tags"].sort());
 assert.equal(event.message,"NEXUS CHAT_INTERNAL");
 assert.equal(technicalEnvelope("someone@example.com secret prompt",Date.now()),null);
 assert.equal(technicalEnvelope({message:"private"},Date.now()),null);
});
test("reporter no-ops without DSN or on unknown event; deduplicates and never follows redirects",async()=>{
 let calls=0,now=1_000_000,config;
 const report=createTechnicalReporter({dsn:()=>config,clock:()=>now,send:async(url,opts)=>{
   calls++;
   assert.equal(url.hostname,"o123.ingest.de.sentry.io");
   assert.equal(opts.redirect,"error");
   assert.equal(opts.method,"POST");
   assert.deepEqual(opts.headers,{"Content-Type":"application/x-sentry-envelope"});
   assert.ok(opts.signal instanceof AbortSignal);
   assert.doesNotMatch(opts.body,/sentry_key|authorization|secret|user_id/);
   return new Response("{}",{status:200});
 }});
 assert.equal(await report("CHAT_INTERNAL"),false);
 config=dsn;
 assert.equal(await report("private data"),false);
 assert.equal(await report("CHAT_INTERNAL"),true);
 assert.equal(await report("CHAT_INTERNAL"),false);
 now+=60000;
 assert.equal(await report("CHAT_INTERNAL"),true);
 assert.equal(calls,2);
});
test("respects Sentry 429 and fails closed on transport error",async()=>{
 let now=1_000_000,calls=0;
 const report=createTechnicalReporter({dsn:()=>dsn,clock:()=>now,send:async()=>{
  calls++;
  if(calls===1)return new Response("",{status:429,headers:{"Retry-After":"120"}});
  throw Error("contains sensitive request");
 }});
 assert.equal(await report("CHAT_INTERNAL"),false);
 now+=61000;
 assert.equal(await report("NEXT_SERVER_ERROR"),false);
 now+=60000;
 assert.equal(await report("NEXT_SERVER_ERROR"),false);
 assert.equal(calls,2);
});
test("monitor is server-only, does not use read token or expose a public test route",()=>{
 const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
 const source=read("lib/core/technical-monitor.ts");
 assert.match(source,/import "server-only"/);
 assert.doesNotMatch(source,/SENTRY_AUTH_TOKEN|NEXT_PUBLIC_SENTRY/);
 assert.match(read("instrumentation.ts"),/onRequestError:Instrumentation.onRequestError=async\(\)=>/);
});

test("manual monitor test sends only a fixed synthetic event after admin verification",()=>{
 const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
 const action=read("app/admin/monitor-action.ts");
 assert.ok(action.indexOf("if(!await getCoreAdmin())")<action.indexOf('await reportTechnicalEvent("MONITOR_TEST")'));
 assert.match(action,/^"use server"/);
 assert.match(action,/sentryEndpoint\(process\.env\.SENTRY_DSN\)/);
 assert.doesNotMatch(action,/formData\.(get|entries)|SENTRY_AUTH_TOKEN|console\./);
 assert.equal(JSON.parse(technicalEnvelope("MONITOR_TEST",1700000000000).trim().split("\n")[2]).message,"NEXUS MONITOR_TEST");
 assert.match(read("app/admin/page.tsx"),/<SentryTestPanel\/>/);
});
