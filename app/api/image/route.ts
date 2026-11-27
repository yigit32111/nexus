import {NextResponse} from "next/server";
export const runtime="nodejs";
// Retired endpoint: no input processing, credentials or upstream requests.
export async function POST(){
 return NextResponse.json({error:"Görsel üretimi NEXUS 5.0'da kaldırıldı.",code:"IMAGE_GENERATION_REMOVED"},{status:410,headers:{"Cache-Control":"no-store"}});
}
