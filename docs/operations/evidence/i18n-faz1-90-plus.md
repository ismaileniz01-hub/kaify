# i18n Faz 1 — 90+ çıkış kanıtı

Tarih: 2026-08-05  
Kapsam: Kullanıcıya açık ve insan gözüyle doğrulanmış diller (`tr`, `en`)

## Sonuç

Yeniden puan: **93/100** (başlangıç: 58/100).

- Mimari ve ilk render: 95 — cookie/Accept-Language sunucu seçimi, doğru `html lang`, hydration boyunca aynı dil.
- Uygulama ve kritik kullanıcı akışları: 94 — raw API hata mesajı yok; tarih, saat, sayı ve Türkçe büyük/küçük harf locale-aware.
- Landing, fiyatlandırma ve yasal yüzeyler: 94 — landing/pricing EN/TR; TR Privacy → KVKK; Terms/Cookies tam TR belge.
- Aktif locale kalitesi: 100 — yalnız insan gözüyle doğrulanmış EN/TR seçilebilir. Diğer sözlükler Faz 3 kalite incelemesine kadar kapalı.
- E-posta ve native: 90 — OTP isteği dili Supabase metadata'ya taşır; Go template EN/TR dallanır; iOS kullanım açıklamaları Türkçeleştirildi.
- Terminoloji: 96 — seri kontrolü auth “Giriş”ten ayrıldı; Market tek terim.
- Test ve kalite kapıları: 94 — parity, duplicate key, placeholder, terminoloji, kritik TR copy, aktif locale, legal belge ve e-posta template testleri.

## Doğrulama

- `npm run i18n:check`: 53 sözlükte anahtar paritesi tam.
- `npm test`: 91 test dosyası / 483 test başarılı.
- Genişletilmiş i18n + auth odak testi: 5 dosya / 79 test başarılı.
- `npm run typecheck`: başarılı.
- `npm run build`: başarılı; 58 statik sayfa üretildi.
- Production browser smoke:
  - `/`: Türkçe landing tek dil.
  - `/pricing`: hero, planlar, karşılaştırmalar, CTA, footer ve cookie banner Türkçe.
  - İlk render ve hydration `lang=tr` olarak sabit.

## Bilinçli sınır

53 sözlüğün anahtar paritesi korunuyor ancak EN/TR dışındaki dillerde yeni metinler İngilizce fallback. Karışık veya yanıltıcı dil sunmamak için bu diller kullanıcı seçiminden geçici olarak kaldırıldı. Faz 3'te insan/MT kalite incelemesinden geçen diller kademeli açılacak.

Supabase hosted email template'in canlı projeye uygulanması denendi ancak ortamda `SUPABASE_ACCESS_TOKEN` bulunmadığı için canlı ayar değiştirilemedi. Şablon ve uygulama komutu repoda hazırdır; token sağlandığında `npm run auth:otp-template` çalıştırılmalıdır.
