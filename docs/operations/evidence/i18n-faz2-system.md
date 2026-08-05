# i18n Faz 2 — sistem dili doğruluğu

Tarih: 2026-08-05  
Kapsam: Admin + formatters + a11y/shell + native TR + sözlük kilidi (aktif diller: `tr`, `en`)

## Sonuç

Yeniden puan (tahmini): **90–93/100 sistem tamamlığı** (Faz 1’deki 93 kullanıcı yüzeyi korundu; admin/shell boşlukları kapandı).

- Admin costs / audit / self-heal → `t('admin.*')` + `formatNumber` / `formatCurrency` / `formatDateTime(lang)`
- Merkezi formatters: `formatDate`, `formatTime`, `formatDateTime`, `formatRelativeShort` eklendi; chat, analytics, leaderboard, gem, kota, bildirim call site’ları bağlandı
- `global-error` cookie/localStorage diline göre EN/TR + doğru `html lang`
- NavigationExperience `a11y.loading_page`
- Android `values-tr/strings.xml`
- Sözlük: `docs/i18n/terminology.md` + kalite testleri genişletildi

## Bilinçli sınır

- Supabase hosted OTP template uygulaması hâlâ `SUPABASE_ACCESS_TOKEN` ister (`npm run auth:otp-template`)
- EN/TR dışı locale’ler Faz 3 kalite incelemesine kadar seçicide kapalı; yeni anahtarlar `i18n:sync` ile EN fallback alır
- Alert mesajları / self-heal reason metinleri sunucu kaynaklı olabilir (operasyonel)

## Doğrulama

- `npm run i18n:sync` + `npm run i18n:check`
- Odak testler + typecheck
