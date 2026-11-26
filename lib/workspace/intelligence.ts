export function words(text:string){return Array.from(new Set(text.toLocaleLowerCase("tr-TR").match(/[\p{L}\p{N}]{3,}/gu)||[])).slice(0,100)}
const memoryStopWords = new Set(["bir", "için", "olan", "ile", "bunu", "bana", "çok", "daha", "şimdi", "what", "the", "and", "for", "this", "that", "you", "nasıl"]);

// Local bilingual concepts supplement literal matches without transmitting saved notes.
const conceptGroups = [
  ["yazılım", "software"], ["sınav", "imtihan", "exam"],
  ["seyahat", "gezi", "travel"], ["renk", "color", "colour"],
  ["kitap", "book"], ["yemek", "food"], ["müzik", "music"],
  ["telefon", "phone"], ["bilgisayar", "computer"], ["doğumgünü", "birthday"],
  ["tatil", "vacation"], ["araba", "otomobil", "car"],
];
const concepts = new Map(conceptGroups.flatMap(group =>
  group.map(word => [word, group[0]] as const)
));

function memoryScore(query: string[], text: string) {
  const tokens = words(text);
  const meanings = new Set(tokens.map(token => concepts.get(token)).filter(Boolean));
  let score = 0;
  for (const word of query) {
    if (tokens.includes(word)) score += 3;
    else if (concepts.has(word) && meanings.has(concepts.get(word))) score += 2;
    else if (tokens.some(token => Math.min(token.length, word.length) >= 5 &&
      (token.startsWith(word) || word.startsWith(token)))) score++;
  }
  return score;
}

export function relevantMemory(memory: string, query: string) {
  const terms = words(query).filter(word => !memoryStopWords.has(word));
  if (!terms.length) return "";
  const lines = new Set(memory.slice(0, 24000).split("\n").map(line => line.trim()).filter(Boolean));
  return Array.from(lines, text => ({ text, score: memoryScore(terms, text) }))
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score)
    .slice(0, 8).map(item => item.text).join("\n").slice(0, 3000);
}
export function summarizeHistory(messages:{role:string;content:string}[]){
 return messages.slice(-18).map(m=>m.role+": "+m.content.replace(/\s+/g," ").slice(0,180)).join("\n").slice(0,2200);
}
export function runMiniCode(source:string){
 if(source.length>4000)throw Error("Kod çok uzun.");
 const vars=new Map<string,number>();const output:string[]=[];
 const lines=source.split("\n").filter(x=>x.trim()&&!x.trim().startsWith("#"));
 if(lines.length>60)throw Error("En fazla 60 satır.");
 function expr(s:string){
  const ts=s.match(/\d+(?:\.\d+)?|[A-Za-z_][A-Za-z0-9_]*|[()+\-*/%]/g)||[];
  if(ts.join("")!==s.replace(/\s/g,"")||ts.length>100)throw Error("Geçersiz ifade");
  let i=0;
  function atom():number{const t=ts[i++];if(t==="("){const v=add();if(ts[i++]!==")")throw Error("Parantez hatası");return v}if(t==="+"||t==="-")return(t==="-"?-1:1)*atom();if(t&&/^\d/.test(t))return Number(t);if(t&&vars.has(t))return vars.get(t)!;throw Error("Bilinmeyen değer: "+(t||""))}
  function mul():number{let v=atom();while(["*","/","%"].includes(ts[i])){const op=ts[i++],r=atom();v=op==="*"?v*r:op==="/"?v/r:v%r}return v}
  function add():number{let v=mul();while(ts[i]==="+"||ts[i]==="-"){const op=ts[i++],r=mul();v=op==="+"?v+r:v-r}return v}
  const v=add();if(i!==ts.length||!Number.isFinite(v)||Math.abs(v)>1e15)throw Error("Geçersiz sonuç");return v;
 }
 let steps=0;
 const indent=(s:string)=>s.match(/^ */)![0].length;
 if(lines.some(l=>/^ *\t/.test(l)))throw Error("Girinti için boşluk kullan.");
 function execute(start:number,end:number,level:number,depth:number){
  if(depth>4)throw Error("Döngü derinliği aşıldı.");
  for(let i=start;i<end;i++){
   if(++steps>1000)throw Error("İşlem sınırı aşıldı.");
   const line=lines[i],s=line.trim();if(indent(line)!==level)throw Error("Girinti hatası");
   const loop=s.match(/^for ([A-Za-z_][A-Za-z0-9_]*) in range\((.+)\):$/);
   if(loop){let j=i+1;while(j<end&&indent(lines[j])>level)j++;if(j===i+1)throw Error("Döngü gövdesi gerekli");
    const n=expr(loop[2]);if(!Number.isSafeInteger(n)||n<0||n>100)throw Error("range: 0–100 tam sayı");
    for(let k=0;k<n;k++){vars.set(loop[1],k);execute(i+1,j,indent(lines[i+1]),depth+1)}i=j-1;continue;
   }
   const pr=s.match(/^print\((.*)\)$/),assign=s.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
   if(pr)output.push(String(expr(pr[1])));else if(assign)vars.set(assign[1],expr(assign[2]));else output.push(String(expr(s)));
   if(output.length>500)throw Error("Çıktı sınırı aşıldı.");
  }
 }
 execute(0,lines.length,0,0);
 return output.join("\n");
}
export type Bar={label:string;value:number};
export function parseChart(raw:string):{title:string;bars:Bar[]}|null {
 try{const x=JSON.parse(raw);if(!x||typeof x.title!=="string"||!Array.isArray(x.bars)||x.bars.length<1||x.bars.length>20)return null; if(x.bars.some((b:any)=>!b||typeof b.label!=="string"||typeof b.value!=="number"||!Number.isFinite(b.value)||b.value<0||b.value>1e12))return null;return {title:x.title.slice(0,120),bars:x.bars.map((b:Bar)=>({label:b.label.slice(0,60),value:b.value}))}}catch{return null}
}

export function recallChats(rows:unknown,query:string,currentId:string,projectId:string|null){
 if(!Array.isArray(rows))return "";
 const q=words(query).filter(w=>!memoryStopWords.has(w));if(!q.length)return "";
 const candidates:{text:string;score:number}[]=[];
 for(const row of rows.slice(0,12)){
  if(!row||typeof row.id!=="string"||row.id===currentId||(row.project_id??null)!==projectId||!Array.isArray(row.messages))continue;
  for(const m of row.messages.slice(-24)){
   if(!m||m.role!=="user"||typeof m.content!=="string")continue;
   const content=m.content.slice(0,4000).replace(/\s+/g," ").trim();
   const score=memoryScore(q,content);
   if(score>0)candidates.push({text:String(row.title||"Sohbet").slice(0,100)+": "+content.slice(0,500),score});
  }
 }
 return Array.from(new Set(candidates.sort((a,b)=>b.score-a.score).map(x=>x.text))).slice(0,4).join("\n").slice(0,2200);
}
