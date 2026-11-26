import {NextRequest,NextResponse} from "next/server";
import {createClient} from "../../../utils/supabase/server";
import {reserveRequest} from "../../../lib/core/budget";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
 try{
  const db=await createClient();const {data:{user},error}=await db.auth.getUser();if(error||!user)return NextResponse.json({error:"Giriş gerekli"},{status:401});
  const body=await req.json().catch(()=>null);const text=typeof body?.text==="string"?body.text:"",format=body?.format;
  if(!text.trim()||text.length>24000||!["docx","xlsx","pptx","zip","csv","md"].includes(format))return NextResponse.json({error:"Geçersiz içerik veya biçim."},{status:400});
  if(!await reserveRequest(user.id,"chat",0))return NextResponse.json({error:"Günlük kota doldu."},{status:429});
  let bytes:Uint8Array;let mime="application/octet-stream";
  const lines=text.split("\n").slice(0,500);
  if(format==="docx"){const {Document,Packer,Paragraph}=await import("docx");const d=new Document({sections:[{children:lines.map(t=>new Paragraph({text:t}))}]});bytes=new Uint8Array(await Packer.toBuffer(d));mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document";}
  else if(format==="xlsx"){const {Workbook}=await import("exceljs");const w=new Workbook(),sheet=w.addWorksheet("NEXUS");lines.forEach(l=>sheet.addRow(l.split("\t").slice(0,40).map(v=>v.slice(0,1000))));sheet.columns.forEach(c=>c.width=25);bytes=new Uint8Array(await w.xlsx.writeBuffer());mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";}
  else if(format==="pptx"){const PptxGenJS=(await import("pptxgenjs")).default;const ppt=new PptxGenJS();ppt.layout="LAYOUT_WIDE";for(let i=0;i<Math.min(text.length,18000);i+=650){const slide=ppt.addSlide();slide.background={color:"101827"};slide.addText("NEXUS • "+(Math.floor(i/650)+1),{x:0.5,y:0.35,w:12,h:0.5,fontSize:22,color:"A5B4FC"});slide.addText(text.slice(i,i+650),{x:0.55,y:1.1,w:12.1,h:5.9,fontSize:18,color:"FFFFFF",margin:0.1,breakLine:false});}bytes=new Uint8Array(await ppt.write({outputType:"nodebuffer"}) as Buffer);mime="application/vnd.openxmlformats-officedocument.presentationml.presentation";}
  else if(format==="zip"){const JSZip=(await import("jszip")).default;const z=new JSZip();z.file("nexus-notes.txt",text);bytes=new Uint8Array(await z.generateAsync({type:"uint8array"}));mime="application/zip";}
  else if(format==="csv"){const escaped=lines.map(l=>l.split("\t").map(v=>'"'+(/^[\s]*[=+\-@]/.test(v)?"'"+v:v).replace(/"/g,'""')+'"').join(",")).join("\r\n");bytes=new TextEncoder().encode("\uFEFF"+escaped);mime="text/csv;charset=utf-8";}
  else{bytes=new TextEncoder().encode(text);mime="text/markdown;charset=utf-8";}
  return new Response(new Uint8Array(bytes),{headers:{"Content-Type":mime,"Content-Disposition":'attachment; filename="nexus-output.'+format+'"',"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
 }catch(e){console.error("NEXUS ARTIFACT ERROR");return NextResponse.json({error:"Dosya oluşturulamadı."},{status:500})}
}
