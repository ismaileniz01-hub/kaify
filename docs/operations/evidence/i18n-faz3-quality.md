# i18n Faz 3 — öncelikli locale kalite + doğrulama

Tarih: 2026-08-05  
Kapsam: Öncelikli market dilleri seçicide açık; parity≠quality gate; E2E dil smoke; residual sweep

## Sonuç

Yeniden puan (tahmini): **95/100**

- Öncelikli diller (`de, fr, es, es-mx, es-ar, pt, it, nl, pl, ru, ar, ja, ko, zh-CN`) EN-identical kritik yüzeylerden temizlendi (GTX retranslate + mevcut MT)
- `LANG_OPTIONS` / SSR cookie Accept-Language bu dillere genişletildi; `ar` için `dir=rtl`
- Quality gate: priority locales public surface ≠ EN clone (`tests/compliance/i18n-quality.test.ts`)
- E2E: `e2e/i18n-language.spec.ts` (tr/en/de/ar/pricing)
- Residual: `scripts/i18n-hardcoded-scan.mjs`; Waitlist/OTP/loading shell kapatıldı
- CI: `npm run ci` içine `i18n:check` eklendi
- OTP hosted apply: token yok — `supabase/email-templates/RUNBOOK.md` + `npm run auth:otp-template`

## Araçlar

- `npm run i18n:retranslate:gtx` — EN-identical değerleri yeniden çevir (Gemini kotası yokken)
- `npm run i18n:retranslate` — Gemini ile (kota varsa)
- `node scripts/i18n-hardcoded-scan.mjs`

## Bilinçli sınır

- TR dışı tam sözlük insan QA’si sürekli iyileştirme ister; machine translation bootstrap’tır.
- Kalan (picker dışı) diller sözlükte tutulur; kritik prefix’ler GTX ile doldurulur, tam 1300 anahtar kademeli.
- Supabase canlı OTP template: `SUPABASE_ACCESS_TOKEN` gerekir.
