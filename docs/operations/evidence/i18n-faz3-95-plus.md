# i18n Faz 3 — öncelikli locale kalite + doğrulama

Tarih: 2026-08-06  
Kapsam: Öncelikli market dilleri seçicide açık; public yüzeylerde EN-klon yok

## Sonuç

Yeniden puan (tahmini): **95/100**

- Seçicide açık diller: `tr`, `en`, `de`, `fr`, `es`, `es-mx`, `es-ar`, `pt`, `it`, `nl`, `pl`, `ru`, `ar`, `ja`, `ko`, `zh-CN`
- Kritik public yüzeyler (landing hero/about, pricing hero/final, a11y, error.global, common.loading/retry) öncelikli dillerde EN-klon değil
- Quality gate: parity + priority ≠ EN testleri
- E2E: `e2e/i18n-language.spec.ts` (TR/EN/DE/AR + RTL)
- Residual: LandingCTA `t()`, WelcomeSkeleton `t("common.loading")`
- SSR: `html lang/dir` reviewed locale listesine bağlı

## Araçlar

- Gemini free-tier 429 → GTX kritik çeviri + `i18n-retranslate-critical-fast.mjs` (paralel, timeout’lu)
- Uzun bekleyen batch iptal edildi; kritik yüzeyler hızlı path ile kapatıldı

## Bilinçli sınır

- Seçicide olmayan ~38 locale sözlükleri parity için duruyor; yeni anahtarlar EN fallback alabilir (Faz 3+ kademeli açılış)
- Hosted Supabase OTP template: `SUPABASE_ACCESS_TOKEN` ile `npm run auth:otp-template` (runbook hazır)
- Privacy EN body + TR KVKK redirect modeli korunuyor

## Doğrulama

- `npm run i18n:check`
- `npx vitest run tests/compliance/i18n-quality.test.ts`
- `npm run typecheck`
