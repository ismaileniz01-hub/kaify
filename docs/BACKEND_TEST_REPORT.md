# Backend Test Report — 2026-07-03

Canlı dev server (`npm run dev`) + Supabase prod DB üzerinde yapılan testler.

## Sonuç: GEÇTI

| Kontrol | Sonuç |
|---------|--------|
| `npm run typecheck` | ✅ |
| `npm run test:coverage` | ✅ 146 test |
| `npm run test:smoke` | ✅ 40/40 endpoint |
| `npm run build` | ✅ |

Smoke test tekrar çalıştır: `npm run test:smoke` (dev server açık olmalı)

---

## Bulunan ve düzeltilen hatalar

### 1. BLOCKER — Leaderboard 500 (prod DB'de RPC yoktu)
- **Hata:** `Could not find function public.get_global_leaderboard`
- **Sebep:** Migration `20260630180000_leaderboard.sql` prod'a uygulanmamıştı
- **Fix:** `get_global_leaderboard` + `get_country_leaderboard` RPC'leri prod DB'ye eklendi (legacy kolon uyumlu `coalesce`)

### 2. BLOCKER — Schema drift (profiles)
- **Hata:** Kod `display_name`/`tier`/`country_code` bekliyor; prod'da `full_name`/`subscription_tier` vardı
- **Sebep:** Eski prod şeması ile migration şeması uyumsuz
- **Fix:**
  - Eksik kolonlar prod'a eklendi (`display_name`, `tier`, `country_code`, …)
  - `lib/supabase/profile-compat.ts` — okuma/yazma legacy uyumu
  - Migration dosyası: `supabase/migrations/20260703140000_schema_bridge_profiles.sql`

### 3. BUG — Self-healing error monitor (önceki tur)
- Tüm route'lara `{ route }` context eklendi
- Beklenmeyen 500'ler de monitor'a kaydediliyor

### 4. INFO — Upstash EVAL failed (dev log gürültüsü)
- Dev'de Upstash Lua script hata veriyor, memory fallback devreye giriyor
- Prod'da Upstash yapılandırılmış; health check `db=ok`
- **Etki:** Dev loglarında gürültü, işlevsel blok yok

---

## Senin tek manuel adımın (2 dk)

Prod DB'de kolonlar eklendi ama **backfill UPDATE** otomatik çalıştırılamadı. Supabase SQL Editor'da bir kez çalıştır:

```sql
-- supabase/migrations/20260703140000_schema_bridge_profiles.sql
-- içindeki UPDATE + NOT NULL bölümünü çalıştır
```

Veya tüm migration dosyasını uygula. Detay: `docs/DEPLOY_CHECKLIST.md` §3.

Backfill olmadan da kod `profile-compat` ile çalışır; backfill DB tutarlılığı için önerilir.

---

## Test kapsamı (smoke)

- Public: health, leaderboard, country-leaderboard
- Auth: 16 endpoint → 401 without session
- Admin: 7 endpoint → 401 without session  
- Cron: 401 without secret, 200 with CRON_SECRET (3 cron)
- Validation: onboarding, 404, envelope shape
