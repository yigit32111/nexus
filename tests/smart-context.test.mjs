import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {compactHistory} from "../lib/core/smart-context.ts";
const long=()=>Array.from({length:32},(_,i)=>({role:i%2?"user":"assistant",content:i===3?"Veritabanı performansında indeks kullanımı önemlidir. "+"x".repeat(3500):i===31?"Veritabanı performansını artırmanın yolları nelerdir?":("Konu "+i+" ").repeat(400)}));
const opts={enabled:true,hasAttachments:false,query:"Veritabanı performansını artırmanın yolları nelerdir?"};
test("long active history shrinks and preserves the newest twelve messages verbatim",()=>{
 const original=long(),snapshot=JSON.stringify(original),r=compactHistory(original,opts);
 assert.equal(r.compacted,true);
 assert.deepEqual(r.messages.slice(-12),original.slice(-12));
 assert.equal(JSON.stringify(original),snapshot);
 assert.ok(r.savedChars>0);
 assert.equal(r.savedChars,snapshot.length-JSON.stringify(r.messages).length);
 assert.match(r.reference,/Veritabanı performansında/);
 assert.ok(r.reference.length<=2200);
 assert.equal(r.messages.at(-1).content,original.at(-1).content);
});
test("short, disabled, attached, exact or ambiguous followups retain original context",()=>{
 const m=long();
 for(const opt of [{...opts,enabled:false},{...opts,hasAttachments:true},{...opts,query:"Devam"},{...opts,query:"Önceki kodu birebir tekrar yaz"},{...opts,query:"Bu kaynak belgeyi incele"},{...opts,query:"What was the exact previous answer?"}]){
  const r=compactHistory(m,opt);assert.equal(r.compacted,false);assert.deepEqual(r.messages,m);
 }
 assert.deepEqual(compactHistory(m.slice(-12),opts).messages,m.slice(-12));
});
test("assistant-ending history is not modified; giant recent messages stay intact",()=>{
 const m=long();m.at(-1).role="assistant";
 assert.equal(compactHistory(m,opts).compacted,false);
 m.at(-1).role="user";m[29].content="İ".repeat(24000);
 const r=compactHistory(m,opts);assert.deepEqual(r.messages.slice(-12),m.slice(-12));
});
test("no relevance means no fabricated memory or external lookup",()=>{
 const m=long().map((m,i)=>({...m,content:i===31?m.content:"x".repeat(3000)}));
 const r=compactHistory(m,opts);assert.equal(r.reference,"");assert.equal(r.compacted,true);assert.ok(r.savedChars>0);
});
test("route compacts before attachment insertion and token accounting, preferences opt-out preserved",()=>{
 const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
 const route=read("app/api/chat/route.ts");
 assert.match(route,/enabled:preferences.smartContext!==false,hasAttachments:attachments.length>0/);
 assert.ok(route.indexOf("const compact=compactHistory")<route.indexOf("if (extractedTexts.length)"));
 assert.ok(route.indexOf("const compact=compactHistory")<route.indexOf("const promptTokensEst"));
 assert.match(route,/freeOnly: true/);
 assert.match(read("app/page.tsx"),/smartContext: prefs.smartContext !== false/);
 assert.match(read("components/SettingsModal.tsx"),/checked=\{prefs.smartContext!==false\}/);
});
