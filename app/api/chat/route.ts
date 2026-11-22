import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const { messages, memory, preferences } = await req.json();
    const key=process.env.AI_API_KEY;
    if(!key) return NextResponse.json({error:"AI_API_KEY .env.local içinde ayarlanmamış."},{status:500});
    if(!Array.isArray(messages)) return NextResponse.json({error:"Mesaj biçimi geçersiz."},{status:400});
    const base=(process.env.AI_BASE_URL||"https://api.openai.com/v1").replace(/\/+$/,"");
    const model=process.env.AI_MODEL||"gpt-4o-mini";
    const style = preferences?.style === "concise" ? "Kısa ve öz cevap ver." : preferences?.style === "detailed" ? "Konuyu gerektiğinde kapsamlı ve adım adım açıkla." : "Dengeli uzunlukta cevap ver.";
    const tone = preferences?.tone === "professional" ? "Profesyonel bir dil kullan." : preferences?.tone === "friendly" ? "Sıcak, doğal ve samimi bir dil kullan." : "Doğal ve net konuş.";
    const system=`Sen NEXUS adlı kişisel yapay zekâ asistanısın. Türkçe konuş. ${style} ${tone} Bilmediğin şeyleri uydurma. ${memory ? `\nKullanıcı tarafından sağlanan kişisel bağlam:\n${String(memory).slice(0,5000)}` : ""}`;
    const response=await fetch(`${base}/chat/completions`,{
      method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
      body:JSON.stringify({model,messages:[{role:"system",content:system},...messages.slice(-24)],temperature:Math.max(0,Math.min(1,Number(preferences?.temperature ?? 0.7)))}),
      signal:AbortSignal.timeout(90000)
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok) return NextResponse.json({error:payload?.error?.message||`AI sağlayıcı hatası (${response.status})`},{status:502});
    const reply=payload?.choices?.[0]?.message?.content;
    return NextResponse.json({reply:typeof reply==="string"?reply:"Yanıt alınamadı."});
  } catch(e:any) {
    return NextResponse.json({error:e?.name==="TimeoutError"?"İstek zaman aşımına uğradı.":"Sunucu hatası: "+(e?.message||"Bilinmeyen hata")},{status:500});
  }
}