"use client";

import {useActionState} from "react";
import {sendMonitorTest} from "./monitor-action";

export function SentryTestPanel(){
 const [message,action,pending]=useActionState(sendMonitorTest,"");
 return <section style={{border:"1px solid #384354",padding:16,borderRadius:12}}>
   <p>Sentry'ye kişisel veri içermeyen bir test olayı gönder. Uygulama hata vermez ve kullanıcı kayıtları değişmez.</p>
   <form action={action}>
     <button type="submit" disabled={pending} style={{border:"1px solid #648db9",borderRadius:8,padding:"12px 16px",minHeight:44,color:"#e2e8f0"}}>{pending?"Gönderiliyor…":"Sentry test olayı gönder"}</button>
   </form>
   {message&&<p role="status" style={{overflowWrap:"anywhere"}}>{message}</p>}
 </section>;
}
