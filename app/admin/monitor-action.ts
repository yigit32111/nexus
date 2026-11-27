"use server";

import {getCoreAdmin} from "../../lib/core/permissions";
import {reportTechnicalEvent} from "../../lib/core/technical-monitor";
import {sentryEndpoint} from "../../lib/core/sentry-events";

export async function sendMonitorTest(_previous:string,_formData:FormData):Promise<string>{
  try {
    if(!await getCoreAdmin())return "Yetkisiz işlem.";
    if(process.env.NODE_ENV!=="production"||!sentryEndpoint(process.env.SENTRY_DSN))return "Sentry bağlantı ayarı eksik veya geçersiz.";
    const accepted=await reportTechnicalEvent("MONITOR_TEST");
    return accepted?"Sentry test olayını kabul etti. Issues bölümünde NEXUS MONITOR_TEST kaydını kontrol et.":"Test olayı gönderilemedi veya 60 saniyelik gönderim sınırı etkin. Sentry ayarlarını kontrol et.";
  } catch {
    return "Test tamamlanamadı.";
  }
}
