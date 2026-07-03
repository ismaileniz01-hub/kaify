# Kaify — Dönüş Checklist (senin tarafın)

Bu liste, kod tarafında tamamlanan işlerden sonra **senin yapman gereken** adımları içerir.
Geldikten sonra yukarıdan aşağı işaretle.

## 1. Deploy (zorunlu)

- [ ] Değişiklikleri commit + push et (veya `npx vercel --prod`)
- [ ] Vercel deploy'unun yeşil olduğunu doğrula
- [ ] Canlı health: `curl -s https://kaifyai.org/api/health` → `{"status":"ok",...}`

## 2. Vercel env değişkenleri (zorunlu)

Aşağıdakiler eksikse prod'da özellikler çalışmaz:

| Değişken | Ne için |
|----------|---------|
| `CRON_SECRET` | Cron + detaylı health (boşluk/placeholder olmasın) |
| `DEEPSEEK_API_KEY` | AI chat |
| `GEMINI_API_KEY` | Vision / kalite kapısı |
| `UPSTASH_REDIS_REST_URL` + `TOKEN` | Rate limit (prod'da zorunlu) |
| `SENTRY_DSN` | Hata izleme |
| `AI_COST_*` (opsiyonel) | Maliyet paneli USD tahmini — `.env.example`'a bak |

Env değiştirdikten sonra **redeploy** gerekir.

## 3. Supabase Dashboard (zorunlu)

- [ ] **Schema bridge migration uygula** (prod DB eski şema kullanıyorsa):
  ```bash
  # Supabase SQL Editor veya CLI ile çalıştır:
  supabase/migrations/20260703140000_schema_bridge_profiles.sql
  ```
  Bu migration `display_name`, `tier`, `country_code` kolonlarını ekler, legacy
  kolonlardan backfill yapar ve leaderboard RPC'lerini oluşturur.
- [ ] **Auth → MFA → TOTP** etkinleştir (MFA UI hazır, dashboard'da açılmalı)
- [ ] Kendi hesabına admin rolü ver:
  ```sql
  update public.profiles set role = 'admin' where id = '<senin-user-uuid>';
  ```
- [ ] Migration `ai_cost_observability` uygulandı mı kontrol et:
  ```sql
  select * from supabase_migrations.schema_migrations order by version desc limit 5;
  ```

## 4. Cron doğrulama (deploy sonrası)

Vercel'de 3 cron tanımlı (`vercel.json`):

| Cron | Sıklık |
|------|--------|
| `/api/cron/cleanup` | günlük 03:00 UTC |
| `/api/cron/cost-check` | 6 saatte bir |
| `/api/cron/self-recovery` | 15 dakikada bir |

Notifications hâlâ **Supabase pg_cron** üzerinden (2 saatte bir).

Manuel test:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://kaifyai.org/api/cron/cost-check
```

## 5. Operatör panelleri (deploy sonrası smoke test)

Admin hesabınla giriş yap, şunları kontrol et:

- [ ] `/admin` — hub kartları, env bayrakları
- [ ] `/admin/costs` — maliyet paneli (yeni AI çağrılarından sonra veri birikir)
- [ ] `/admin/self-heal` — circuit / degraded durumu
- [ ] `/admin/audit` — admin işlem geçmişi

## 6. Kullanıcı tarafı smoke test

- [ ] `/settings` — kullanım limitleri bölümü görünüyor mu (giriş yapmış kullanıcı)
- [ ] `/settings/security` — MFA + JSON veri dışa aktarma
- [ ] `/welcome` — leaderboard sıralaması (auth: `#rank` rozeti)
- [ ] Chat + vision (Maya/Leo) — kota sayaçları artıyor mu

## 7. Bilerek ertelenen (opsiyonel / sonra)

| Konu | Durum |
|------|-------|
| `POST /api/onboarding` | Backend hazır, welcome onboarding formu henüz bağlanmadı |
| `npm run i18n:fill` | Gemini kotası dolunca 54 dil tamamlanır |
| LemonSqueezy ödeme | Entegrasyon bekliyor |
| 4 leaderboard endpoint birleştirme | Çalışıyor, bakım kolaylığı için ileride sadeleştirilebilir |
| `/api/subscribe` | `/api/waitlist` ile mükerrer; landing waitlist kullanıyor |

## 8. Kod tarafında tamamlanan (benim tarafım)

- CI yeşil: lint + typecheck + 139 test + build
- Self-healing: tüm API route'ları `{ route }` context ile error-monitor'a bağlı
- Cron auth: paylaşılan `lib/api/cron-auth.ts`
- Leaderboard field mismatch düzeltildi (`myRank`/`totalRanked`)
- Demo `user_001` literal'ları kaldırıldı
- **Schema bridge**: `lib/supabase/profile-compat.ts` legacy kolon desteği
- **Leaderboard RPC'ler** prod DB'ye uygulandı (get_global/country_leaderboard)
- Backend smoke test: `npm run test:smoke` (dev server gerekir)
- Settings'e kullanım kotası UI eklendi
- Security'e GDPR JSON export eklendi
- Admin hub'a referral listesi eklendi
- AI cost observability migration Supabase'e uygulandı

---

Sorun olursa: `docs/RUNBOOK.md` + Sentry + `/admin/self-heal`
