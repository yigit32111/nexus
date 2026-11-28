# NEXUS AI 5.1.2

NEXUS, Türkçe sohbet, kaynaklı araştırma, belge üretimi ve sesli konuşmayı aynı hesapta bir araya getiren bir yapay zekâ çalışma alanıdır. 5.1.2’de sohbetten kaynak arama ve Derin düşünme düğmeleri ile kod taslağı yazma, çıktı aktarma ve yazdırma araçları bulunur. [Smart Context](docs/5.1-smart-context.md) · [Cost Intelligence](docs/5.1-cost-intelligence.md)

## Nereden başlanır?

Hesabınla giriş yapıp **Yeni sohbet** aç. Model menüsünden **NEXUS Auto**’yu seçebilir, ataçla dosya ekleyebilir veya mikrofonla yazdırabilirsin. Üstteki **Çalışma alanı** düğmesi projeleri, araştırmayı, Code Lab’i, dosya araçlarını, Multi-AI’ı ve Agent Mode’u açar.

[NEXUS uygulamasını aç](https://nexus-ifn5.onrender.com)

## Sohbet ve model seçimi

| Özellik | Nasıl çalışır? |
| --- | --- |
| Auto 3.0 | OpenRouter kataloğunda fiyatı ve yetenekleri kontrol edilen ücretsiz modeller arasından soruya, görsele ve bağlam uzunluğuna göre seçim yapar. Uygun geçici sağlayıcı hatalarında bir farklı model daha dener. Her deneme kotaya dahildir. |
| Thinking Mode | Ayarlarda **Hızlı**, **Dengeli** veya **Derin analiz** seçilir. Hızlı profil çıktı uzunluğunu sınırlar. Derin analiz, model seçimini ve cevabın varsayım, belirsizlik ve gerekçeleri açıklamasını etkiler. |
| Multi-AI | Aynı soruya iki farklı ücretsiz modelden sırayla yanıt alırsın. İstersen üçüncü çağrıyla ortak noktaları ve farklılıkları özetletir, sonucu düzenlemek için dosya alanına aktarırsın. İki uygun modelin kullanılabilir olması gerekir. |
| Agent Mode | Yazı konusu için önce bir plan hazırlar. Planı inceledikten sonra ikinci aşamayı sen başlatırsın. Çıktı düzenlenebilir bir yazı taslağıdır. |
| Yanıt araçları | Akış hâlinde yanıt, Markdown ve kod blokları, kopyalama, mesaj düzenleme, yeniden üretme, daha kısa veya ayrıntılı yanıt isteme ve sesli okuma. Sağlayıcı desteklediğinde düşünme içeriği ayrı açılabilir. |
| Dosya ve görsel | PDF ve TXT içeriğini sohbete ekleyebilir, PNG, JPG veya WebP görsellerini yükleyebilir ya da yapıştırabilirsin. Görsel analizi uyumlu model gerektirir. Eski görsel mesajlarına sohbet geçmişinden erişebilirsin. |
| Web araması | Ücretsiz kaynaklı araştırmayı çalışma alanından açabilirsin. |

## Projeler, Gems ve Memory 3.0

- **Sohbet geçmişi** otomatik başlık, arama, sabitleme, yeniden adlandırma, arşivleme ve silmeyi destekler. Son görünür sohbet silindiğinde temiz bir sohbet açılır.
- **Projeler** konuşmaları konuya göre gruplar. Bir projeye talimat, referans notu ve metin dosyası ekleyebilir, sohbeti projeye bağlayabilir ve geçmişi projeye göre filtreleyebilirsin.
- **Gems** belirli bir görev için talimatları olan asistanlardır. Hazır asistanları kullanabilir veya kendi Gem’ini oluşturabilirsin. Bilgi bankasına eklediğin belgelerden soruyla ilgili parçalar seçilir ve kaynak dosyalar yanıtta gösterilebilir.
- **Memory 3.0** elle eklenen notları ve onayladığın hafıza önerilerini kullanır. Kayıtları kategorilere ayırabilir, düzenleyebilir ve silebilirsin. Arama sözcükleri, sözcük biçimlerini ve sınırlı bir Türkçe–İngilizce kavram listesini eşleştirir. İsteğe bağlı geçmiş hatırlama, aynı proje kapsamındaki önceki kullanıcı mesajlarını tarar.
- **Smart Context** uzun sohbetlerde en yeni mesajları korur ve önceki ilgili mesajlardan kısa alıntılar seçer. Ayarlardan kapatılabilir.
- **Hesap ve tercihler** e-posta/parola ile giriş, parola sıfırlama, kullanıcıya özel bulut eşitlemesi ve yerel yedek içerir. Ayarlardan tema, üslup, ton, model ve yaratıcılık düzeyi değiştirilebilir. Sohbet ve ayarlar JSON olarak yedeklenip geri alınabilir. Açık sohbet Markdown olarak indirilebilir.

## Araştırma, kod ve dosyalar

| Araç | Girdi ve çıktı |
| --- | --- |
| Deep Research 2.0 | Türkçe ve İngilizce Vikipedi özetleriyle Crossref yayın kayıtlarını arar. Kapsamı yalnız Crossref ile sınırlayabilirsin. Kaynak başlıklarını ve bağlantıları gösterir, istek üzerine numaralı kaynaklarla karşılaştırmalı özet üretir. Akademik yayınların tam metnini incelemez. |
| Code Lab Pro | Tarayıcıda sayısal ifadeler, değişkenler, `print()` ve sınırlı `for … in range(…)` döngüleri çalıştırır. Satır, işlem ve çıktı sınırları vardır. Dil Python benzeri bir alt kümedir. |
| Artifacts 2.0 | Metin yazabilir, yerel metin dosyasını açıp düzenleyebilir veya araştırma ve asistan çıktılarını aktarabilirsin. PDF, DOCX, XLSX, PPTX, ZIP, CSV, Markdown ve TXT çıktıları ile yazdırma desteği vardır. Tablo çıktılarında sütunlar sekmeyle ayrılır. |
| Canvas | Sohbetten açılan metin veya kodu düzenleme, desteklenen HTML, SVG ve React içeriklerini tarayıcıda önizleme, modelden düzenleme isteme, indirme ve bağlantıyla paylaşma. Önizleme ayrı bir iframe içinde çalışır. |
| Etkileşimli kartlar | Uyumlu yanıtlarda grafik, hesaplayıcı ve indirilebilir belge kartları gösterilir. Çalışma alanında grafik verisini düzenleyerek sonucu görebilirsin. |

## Voice 2.0 ve mobil kullanım

**Sesle yaz** konuşmanı mesaj kutusuna aktarır. **NEXUS Live → Mikrofonu aç** sesli sohbeti başlatır. Konuşmayı gönderebilir, mikrofonu sessize alabilir, yanıtı kesebilir veya **Yanıtı seslendir** ile tekrar dinleyebilirsin. Türkçe, İngilizce ve Almanca konuşma dili seçenekleri ile okuma hızı ayarı vardır.

Ses tanıma tarayıcı desteğine, mikrofon iznine ve cihazın konuşma servisine bağlıdır. Doğrudan tanıma sunmayan tarayıcılarda klavyenin dikte özelliği kullanılabilir. Mobil arayüz ve PWA manifesti ana ekrandan erişimi destekler. Sohbet ve bulut eşitlemesi internet bağlantısı gerektirir.

## Admin Center 3.0

Yönetici hesabı `/admin` sayfasında şu göstergeleri görür:

- **Çevrimiçi kullanıcı** son iki dakikada görünür sohbet, çalışma alanı veya yönetim sekmesinden sinyal veren benzersiz hesapları sayar. Açık yönetim paneli yaklaşık dakikada bir yenilenir.
- **Free ve Pro hesaplar** sunucunun yönettiği hesap bilgilerinden sayılır. `app_metadata.plan` değeri `pro` olan hesaplar Pro grubundadır.
- **Toplam token** tüm kullanıcıların kayıtlı giriş ve çıkış tokenlarının toplamıdır. Bazı kullanım değerleri tahminidir.
- **Günlük kotalar** UTC gününe göre istekler, görsel denemeleri, kullanım kayıtları, ayrılan bütçe ve kullanıcı başına sınırları gösterir. Yönetim ekranı salt okunurdur.
- **Cost Intelligence önizlemesi** son yedi UTC gününün token kullanımını ve modele göre kullanım dökümünü gösterir. Maliyeti bilinmeyen kayıtlar ayrıca işaretlenir.

## Yerel çalıştırma

CI, Node.js 22 kullanır. Proje Next.js, React, TypeScript ve Supabase üzerine kuruludur.

1. Depoyu indir ve `package.json` bulunan klasörü aç.
2. Supabase projesinde e-posta ile oturum açmayı yapılandır. Depodaki SQL dosyaları mevcut NEXUS şemasını genişletir. Sıfırdan kurulum için temel `nexus_chats` ve `nexus_user_settings` tabloları ile kullanıcıya göre erişim politikaları ayrıca gereklidir. Mevcut projede uygulanmış geçişleri tekrar çalıştırmadan önce geçiş geçmişini kontrol et. [Şema değişiklikleri](supabase/migrations) · [Dağıtım sonrası erişim ayarları](docs/supabase-hardening-3.2.1.md)
3. Proje kökünde `.env.local` oluştur ve aşağıdaki değişkenleri kendi ortamın için tanımla.
4. Bağımlılıkları yükle ve geliştirme sunucusunu başlat.

```sh
npm ci
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini aç. Üretim için önce `npm run build`, ardından `npm run start` çalıştırılır. Render’da değişkenler servisin **Environment** bölümünde tanımlanır.

| Değişken | Kullanım |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje adresi |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Tarayıcı için yayımlanabilir anahtar. Eski projelerde `NEXT_PUBLIC_SUPABASE_ANON_KEY` kullanılabilir. |
| `SUPABASE_SECRET_KEY` | Sunucuda kota, kullanım ve yetkili veri işlemleri. Eski anahtar için `SUPABASE_SERVICE_ROLE_KEY` desteklenir. |
| `OPENROUTER_API_KEY` | OpenRouter sunucu anahtarı. Mevcut kurulumlar `AI_API_KEY` ile çalışmaya devam eder. |
| `AI_BASE_URL`, `AI_MODEL` | İsteğe bağlı sağlayıcı adresi ve varsayılan model. NEXUS 5.1 doğrulanmış ücretsiz OpenRouter modellerini kullanır. AI_MODEL, Auto için ikincil öncelik ipucudur. Varsayılan adres `https://openrouter.ai/api/v1` değeridir. |
| `NEXUS_ADMIN_USER_ID` | Yönetim paneline erişecek Supabase kullanıcısının UUID değeri |
| `NEXUS_ADDITIONAL_ADMIN_USER_IDS` | İsteğe bağlı, virgülle ayrılmış ek yönetici Supabase kullanıcı UUID’leri. Sunucu tarafında tanımlanır. |
| `NEXT_PUBLIC_APP_URL` | Paylaşım bağlantıları için uygulamanın dışarıdan erişilen adresi |

Sunucu anahtarlarını yalnız sunucu ortamında tut. Kullanıcı verilerine erişim Supabase oturumu, sunucu kontrolleri ve satır düzeyi güvenlik politikalarıyla sınırlandırılır. Bağlantıyla paylaşılan içeriği bağlantıya sahip kişiler okuyabilir.

## Testler ve sürüm durumu

```sh
npm test
npm run lint
npm run build
npm audit --omit=dev --audit-level=moderate
```

GitHub Actions ayrıca çalışan üretim sunucusunda genel ve korumalı yolları, Chromium masaüstünü, WebKit mobil görünümlerini ve çalışma alanı akışlarını kontrol eder. Testler model karşılaştırması, belgeye aktarım, Agent onayı, Code Lab, son sohbetin silinmesi ve ses denetimlerini kapsar. Ses testinde tanıma olayları benzetilir. Fiziksel iPhone mikrofonu, hoparlörü ve gerçek sağlayıcıyla uçtan uca sesli konuşma ayrıca doğrulanmalıdır. [Test komutları ve ortamı](.github/workflows/alpha-ci.yml) · [GitHub Actions sonuçları](https://github.com/yigit32111/nexus/actions)
