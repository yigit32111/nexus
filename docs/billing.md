# NEXUS üyelik ve ödeme

NEXUS Auto ücretsiz kalır. Pro 249 TL/ay ve 2 USD model kullanımı, Pro Plus 499 TL/ay ve 5 USD model kullanımı sunar. Ek kredi 149 TL karşılığında 1,50 USD model bakiyesi sağlar. Fiyat ve model hakkı lib/billing/offers.ts içinde tanımlanır. Bunlar satış fiyatı ve maliyet bütçesidir. Gerçek net gelir kur, işlem giderleri ve vergilere bağlıdır.

## Test mağazası kurulumu

1. Test için ayrı bir Supabase projesinde mevcut NEXUS geçişleri üzerine 20261128000100_nexus_billing.sql dosyasını uygulayın. İlk kullanımda ödeme veritabanı test veya canlı ortama bağlanır.
2. Lemon Squeezy mağazasının satış para birimini TRY olarak ayarlayın. Pro ve Pro Plus için birer aylık sabit fiyatlı abonelik varyantı ve ek kredi için tek ödemeli varyant oluşturun. Varyant fiyatlarını NEXUS ile eşleştirin. Kupon, ücretsiz deneme, miktar seçimi ve dönem ortası plan değişimini kapatın. Paket değişimi için mevcut üyeliği dönem sonunda iptal edip yeni plan satın alın.
3. Sunucuda NEXUS_BILLING_MODE=test, LEMON_STORE_ID, LEMON_API_KEY, LEMON_WEBHOOK_SECRET, LEMON_VARIANT_PRO, LEMON_VARIANT_PLUS ve LEMON_VARIANT_EXTRA tanımlayın. Her varyant farklı olmalıdır. Anahtarlar sunucuda kalır.
4. Mağaza bildirim adresi uygulama alan adındaki /api/billing/webhook yoludur. Abonelik yaşam döngüsü, subscription_payment_success, subscription_payment_recovered, subscription_payment_refunded, order_created ve order_refunded olaylarını etkinleştirin.
5. /plans üzerinden test alışverişi yapın. Ödeme sonrası ilk bildirim işlenince sayfayı yenileyin. İlk fatura, yenileme, iptal, iade, tekrarlanan bildirim ve faturanın abonelikten önce gelmesi senaryolarını test mağazasında doğrulayın. Bekleyen webhook teslimatlarını mağazadan yeniden gönderebilirsiniz. Test modunda gerçek ücretli model çağrıları kapalıdır.

## Canlı ortam ve limitler

Onaylanmış canlı mağaza, ayrı canlı Supabase veritabanı, canlı API/webhook anahtarları ve canlı varyant kimlikleri gereklidir. NEXUS_BILLING_MODE=live olduğunda ve nexus_core_limits.paid_enabled etkinleştirildiğinde ödeme açılabilir. NEXUS_PRO_MODELS ile virgülle ayrılmış OpenRouter kimlikleri belirlenir. Katalogda doğrulanmış, fiyatı okunabilen bir metin modeli bulunması gerekir. Yönetici portalından satıcı ödemeleri yönetilir. Kullanıcı /plans sayfasından abonelik ve fatura portalına geçer.

Kullanıcı ve sistemin günlük istek ve dolar limitleri nexus_core_limits tablosundadır. Varsayılan korumalar kullanıcı başına 50, sistem genelinde 500 istek/gün ve sırasıyla 0,25 USD ve 2 USD günlük rezervasyon bütçesidir. Gün sınırı UTC olarak hesaplanır. Bu günlük limitler üst maliyet tahminini, abonelik bakiyesi ise doğrulanmış kullanım maliyetini izler. Free ve Pro Auto çağrılarında model ücreti sıfırdır. Ücretli modellerde metin/PDF desteklenir, çıkış sınırı düşünme profiline göre 1.024 veya 4.096 tokendir. NEXUS Auto ücretli modele otomatik geçmez.

Abonelik faturası ve tek seferlik sipariş ayrı bakiye kayıtlarıdır. Satışın doğrulanması ve rezervasyon yalnızca sunucu tarafındadır. Aylık hak önceliklidir. Satın alınmış ek hak, kullanıcı sohbette onay verirse kullanılabilir. Kendiliğinden kart tahsilatıyla ek bakiye yüklenmez. İptal edilen abonelik ödenmiş dönemin bitimine kadar kullanılabilir. Tam iadede ilgili hak geri alınır, kısmi iadede orantılı azaltılır.

Sağlayıcı maliyeti doğrulanamayan istekte tutar beklemede kalır. Sonraki ücretli istekte 24 saatten eski belirsiz rezervasyon kullanıcıya iade edilir, belirsiz sağlayıcı maliyetini işletme üstlenir. Modelin raporladığı maliyet kullanıcıya ayrılan tutarı aşarsa fark da işletmeye aittir. Mutabakat için nexus_billing_holds kayıtları OpenRouter kullanım günlüğüyle birlikte incelenebilir.
