export function speechError(code: string) {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
    case "NotAllowedError": return "Mikrofon veya konuşma tanıma izni verilmedi. Bu site için tarayıcı izinlerini ve cihaz ayarlarını kontrol et.";
    case "audio-capture": return "Mikrofona erişilemedi. Bağlı mikrofonu ve cihaz izinlerini kontrol et.";
    case "network": return "Tarayıcının konuşma tanıma servisine ulaşılamadı. Bağlantını kontrol edip tekrar dene.";
    case "no-speech": return "Ses algılanmadı. Mikrofonu açıp tekrar konuş.";
    case "language-not-supported": return "Cihaz bu konuşma dilini desteklemiyor.";
    default: return "Konuşma tanıma başlatılamadı. Tekrar dene veya klavyenin diktesini kullan.";
  }
}

export function speechText(results: ArrayLike<{0?: {transcript?: string}}>) {
  return Array.from(results, result => result[0]?.transcript?.trim() || "").filter(Boolean).join(" ");
}
