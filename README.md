# NEXUS AI 3.0

NEXUS AI 3.0, Next.js + Supabase tabanlı kişisel AI çalışma alanıdır. Bu sürüm NEXUS 2.1 kaynaklarından ayrı bir paket olarak hazırlanmıştır. 2.0/2.1 klasörlerini değiştirmez.

## Öne çıkan özellikler

- Supabase Auth ile e-posta/şifre hesabı ve kullanıcıya özel çalışma alanı
- Supabase bulut senkronizasyonu ve kullanıcı kimliğine göre ayrılmış yerel yedekleme
- Groq ve OpenAI uyumlu sağlayıcılarla sohbet; sunucu tarafında API anahtarı
- Sağlayıcının `/models` uç noktasından dinamik model kataloğu
- Çoklu sohbet, otomatik başlık, sohbet arama, sabitleme, arşivleme, yeniden adlandırma ve silme
- Mesaj kopyalama, düzenleme, yeniden üretme ve tarayıcıda sesli okuma
- Groq GPT-OSS modellerinde isteğe bağlı yerleşik web araması ve kod çalıştırma
- Tarayıcı destekliyorsa sesle yazma
- PDF, TXT, JPG, PNG ve WEBP dosyası ekleme; PDF/metin içeriğini modele aktarma
- Onay gerektiren hibrit kişisel hafıza; manuel kayıt, öneri onayı, düzenleme, kategori ve silme
- Koyu/açık tema, yanıt uzunluğu, ton, model ve yaratıcılık ayarları
- JSON tam yedekleme/geri yükleme; aktif sohbeti Markdown olarak indirme
- Klavye kısayolları, mobil uyumlu arayüz ve PWA manifesti
- Supabase RLS migration dosyası

## Gereksinimler

- Node.js 20 veya üzeri
- Supabase projesi ve Auth e-posta/şifre sağlayıcısı
- Groq API anahtarı (veya OpenAI uyumlu başka bir sağlayıcı)

## Kurulum

1. `.env.example` dosyasını `.env.local` adıyla kopyala.
2. `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY veya eski projelerde NEXT_PUBLIC_SUPABASE_ANON_KEY` alanlarını kendi Supabase proje bilgilerinden doldur.
3. `AI_API_KEY`, `AI_BASE_URL` ve `AI_MODEL` alanlarını sağlayıcı ayarlarına göre doldur. Groq için varsayılan adres `https://api.groq.com/openai/v1` şeklindedir.
4. `supabase/migrations/20261124_nexus_30_security.sql` dosyasının içeriğini Supabase SQL Editor'de çalıştır. Mevcut tablolar ve politikalar için önce yedek al. Bu migration yalnızca `nexus_chats` ve `nexus_user_settings` tablolarındaki politikaları yeniler.
5. Kurulumdan sonra `supabase/verification/NEXUS_3.0_RLS_DOGRULAMA.sql` dosyasını çalıştırıp RLS durumunu ve gerçek politika koşullarını kontrol et.
6. Proje klasöründe `npm install` ve ardından `npm run dev` çalıştır.
7. Tarayıcıda `http://localhost:3000` adresini aç.

PowerShell'de npm komutu engellenirse `npm.cmd install`, `npm.cmd run dev` ve `npm.cmd run build` kullan.

## Render ortam değişkenleri

Render servisinde `.env.local` dosyası kullanılmaz. Aynı değişkenleri Render > Environment bölümüne ayrı ayrı ekle. API anahtarını kaynak koduna veya GitHub deposuna koyma. `.env.local` dosyasını hiçbir zaman commit etme.

## Güvenlik notları

- Sohbet ve ayar tabloları `auth.uid() = user_id` RLS kurallarıyla kullanıcı bazında ayrılır.
- SQL migration mevcut eski politikaları kaldırıp bu tablolar için net sahiplik politikaları oluşturur. SQL'i çalıştırmadan önce mevcut şemayı/yedeği gözden geçir.
- API anahtarı yalnızca sunucu rotalarında okunur.
- Tarayıcı tarafı kontrolleri tek başına güvenlik garantisi değildir; RLS politikalarını Supabase SQL Editor'de doğrula.
- Mesaj ve hafıza verileri Supabase hesabında saklanır. JSON yedeği indirildiğinde dosyayı güvenli yerde tut.
- Web araması ve kod çalıştırma, Groq GPT-OSS 20B/120B modellerinde isteğe bağlı yerleşik araçlarla çalışır. Diğer sağlayıcılarda bu araçlar kapalıdır.

## Sağlayıcı referansları

Groq API, OpenAI uyumlu Chat Completions ve model listeleme uç noktalarını sunar. Etkin model kimlikleri zamanla değişebileceğinden model kataloğu sunucudan dinamik alınır. Detaylar: https://console.groq.com/docs/models ve https://console.groq.com/docs/api-reference
