# NEXUS AI 2.0

Fütüristik arayüz, animasyonlu açılış ekranı, sohbet geçmişi, yerel kişisel hafıza, yanıt tercihleri, sesle yazma, sesli yanıt, sohbet dışa aktarma ve PWA desteği sunan Next.js uygulaması.

## Kurulum
1. Node.js 20+ kurulu olmalı.
2. Proje klasöründe `npm install` çalıştırın.
3. `.env.example` dosyasını `.env.local` olarak kopyalayın.
4. Sağlayıcınıza göre ortam değişkenlerini doldurun. Örnek Groq:

```env
AI_API_KEY=GROQ_API_ANAHTARINIZ
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=openai/gpt-oss-120b
```

5. `npm run dev` komutuyla başlatın ve `http://localhost:3000` adresini açın.

## Özellikler
- Sinematik NEXUS açılış ekranı ve neon/cam görünümlü arayüz
- Mobil uyumlu sohbet ve kenar menüsü
- Sohbet arama, silme ve TXT dışa aktarma
- Yerel hafıza, cevap uzunluğu, ton ve yaratıcılık ayarları
- Sunucu tarafında API anahtarı; tarayıcıya gönderilmez
- Sağlayıcı/model durum paneli
- Tarayıcı destekliyorsa sesle yazma ve yanıtları sesli okuma
- PWA manifest ve iPhone ana ekrana ekleme desteği

## Notlar
Sohbetler ve kişisel tercihler bu tarayıcının localStorage alanında tutulur; farklı cihazlarla senkronize olmaz. Gerçek zamanlı web araması, dosya analizi, hesap sistemi ve bulut senkronizasyonu bu sürümde bulunmaz. API kullanımı sağlayıcının ücretsiz/ücretli plan limitlerine tabidir.
