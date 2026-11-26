import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
const base="http://127.0.0.1:3001";
const scenarios=[
 ...["/login","/manifest.webmanifest","/icon.svg"].map(path=>({path,method:"GET",allowed:[200]})),
 ...["/","/workspace","/admin"].map(path=>({path,method:"GET",allowed:[302,303,307,308,401,404]})),
 ...["/api/chat","/api/image","/api/artifacts","/api/research","/api/share","/api/gems/docs"].map(path=>({path,method:"POST",allowed:[401]})),
 ...["/api/status","/api/models"].map(path=>({path,method:"GET",allowed:[401]})),
 {path:"/api/gems/docs",method:"DELETE",allowed:[401]},
 {path:"/api/chat",method:"POST",allowed:[401],body:{comparison:true,model:"auto",messages:[{role:"user",content:"test"}]}},
 {path:"/api/research",method:"POST",allowed:[401],body:{query:"test",scope:"academic"}}
];
const jobs=Array.from({length:8},()=>scenarios).flat();
const durations=[];let next=0;
const start=performance.now();
await Promise.all(Array.from({length:8},async()=>{while(next<jobs.length){
 const job=jobs[next++],t=performance.now();
 const res=await fetch(base+job.path,{method:job.method,redirect:"manual",signal:AbortSignal.timeout(10000),...(job.method==="POST"?{headers:{"Content-Type":"application/json"},body:JSON.stringify(job.body||{})}:{})});
 await res.arrayBuffer();assert.ok(job.allowed.includes(res.status),job.path+" "+res.status);
 durations.push(performance.now()-t);
}}));
durations.sort((a,b)=>a-b);
console.log(JSON.stringify({test:"local-concurrency",requests:durations.length,concurrency:8,elapsedMs:Math.round(performance.now()-start),p50Ms:Math.round(durations[Math.ceil(durations.length*.5)-1]),p95Ms:Math.round(durations[Math.ceil(durations.length*.95)-1]),maxMs:Math.round(durations.at(-1))}));
