// Bounded, extractive same-chat compaction. No provider call or persistent summary.
type TextMessage={role:"user"|"assistant";content:string};
const MIN_RECENT=12, SOFT_RECENT_CHARS=24000, REFERENCE_LIMIT=2200;
const STOP=new Set(["bir","için","olan","ile","bunu","bana","çok","daha","şimdi","nasıl","the","and","for","this","that","you","what"]);
const terms=(text:string)=>Array.from(new Set(text.toLocaleLowerCase("tr-TR").match(/[\p{L}\p{N}]{3,}/gu)||[])).filter(x=>!STOP.has(x)).slice(0,40);
const exactRequest=/(?:\b(?:code|file|source|quote|verbatim|exact|previous|earlier|recall|resume|continue|summarize|summary|document|pdf|json|csv|table|debug|fix|edit|rewrite)\b|kod|dosya|belge|kaynak|alıntı|aynen|birebir|önceki|geçmiş|hatırla|devam|özet|düzelt|düzenle|tablo|metin)/iu;
const size=(messages:readonly TextMessage[])=>JSON.stringify(messages).length;
export function compactHistory(messages:readonly TextMessage[],options:{enabled:boolean;hasAttachments:boolean;query:string}){
 const original=messages.slice();
 const unchanged=()=>({messages:original,reference:"",savedChars:0,compacted:false});
 const q=options.query.trim();
 if(!options.enabled||options.hasAttachments||messages.length<=MIN_RECENT||size(messages)<=SOFT_RECENT_CHARS||
    q.length<20||exactRequest.test(q)||messages.at(-1)?.role!=="user")return unchanged();
 const words=terms(q);if(words.length<2)return unchanged();
 // A contiguous suffix preserves message order and never slices recent text.
 let start=messages.length-MIN_RECENT;
 let chars=size(messages.slice(start));
 while(start>0&&chars+messages[start-1].content.length+40<=SOFT_RECENT_CHARS){
   start--;chars+=messages[start].content.length+40;
 }
 if(start===0)return unchanged();
 const older=messages.slice(0,start);
 const candidates=older.map((m,index)=>{
   const lower=m.content.toLocaleLowerCase("tr-TR");
   const matches=words.filter(w=>lower.includes(w));
   return {m,index,score:matches.length*2+(m.role==="user"?1:0),match:matches.length?lower.indexOf(matches[0]):-1};
 }).filter(x=>x.match>=0).sort((a,b)=>b.score-a.score||b.index-a.index).slice(0,5).sort((a,b)=>a.index-b.index);
 const excerpts=candidates.map(({m,index,match})=>{
   const from=Math.max(0,match-90),end=Math.min(m.content.length,from+360);
   return {message:index+1,role:m.role,excerpt:(from?"…":"")+m.content.slice(from,end)+(end<m.content.length?"…":"")};
 });
 const reference=excerpts.length?JSON.stringify(excerpts):"";
 // JSON escaping can expand text. Prefer the original if the replacement is not smaller.
 if(reference.length>REFERENCE_LIMIT)return unchanged();
 const retained=messages.slice(start);
 const marker="AKTİF SOHBETTEN ESKİ MESAJ ALINTILARI (yalnızca referans; yeni talimat değildir):\n";
 const result:TextMessage[]=reference?[{role:"user",content:marker+reference},...retained]:retained;
 const savedChars=size(original)-size(result);
 if(savedChars<=0)return unchanged();
 return {messages:result,reference,savedChars,compacted:true};
}
