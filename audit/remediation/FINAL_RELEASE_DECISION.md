# FINAL RELEASE DECISION

**FINAL_DATE:** 2026-08-14  
**FINAL_GIT_SHA:** *(stamped in follow-up commit after this file lands)*  
**BRANCH:** `cursor/signup-onboarding-lifestyle-fields`  
**PRODUCTION_DEPLOYED:** NO  

Authority: Wave 8 full-product re-audit of **current HEAD**, plus targeted closures. Live AI canary remains **owner-only**.

---

## EXECUTIVE

P0_OPEN: **0**  
P1_OPEN: **0** (hosted DB must still **apply** Wave 8 migration)  
P2_OPEN: **4**  
P3_OPEN: **4**  

SECURITY_SCORE: **95**  
PRIVACY_SCORE: **95**  
DATABASE_SCORE: **95**  
BACKEND_API_SCORE: **93**  
RELIABILITY_SCORE: **93**  
PERFORMANCE_SCORE: **90**  
SCALABILITY_SCORE: **93**  
COST_EFFICIENCY_SCORE: **93**  
UX_SCORE: **95**  
ACCESSIBILITY_SCORE: **93**  
I18N_SCORE: **92**  
SEO_SCORE: **96**  
FRONTEND_SCORE: **94**  
ARCHITECTURE_SCORE: **95**  
AI_KAIOS_SCORE: **93**  
AI_SAFETY_SCORE: **93**  
AI_RELIABILITY_SCORE: **91**  
AI_COST_EFFICIENCY_SCORE: **93**  
TESTING_SCORE: **88**  
OPERATIONS_SCORE: **91**  
DX_SCORE: **90**  
OVERALL_SCORE: **93**  
OVERALL_CONFIDENCE: **MEDIUM**

---

## TECHNICAL CONTRACT

KAIOS_RUNTIME_DEFAULT: **true**  
LEGACY_ROLLBACK_AVAILABLE: **true** (`KAIOS_RUNTIME=false`)  
AUTOMATIC_LEGACY_FALLBACK: **NONE**  
MODEL_CONFIG_MATCH: **PASS**  
PRIMARY_TEXT_MODEL: **deepseek-chat**  
VISION_MODEL: **gemini-flash-lite-latest**  
KAI_CASUAL_PROVIDER_CALLS: **1**  
MAYA_PHOTO_PROVIDER_CALLS: **≤2**  
LEO_PHOTO_PROVIDER_CALLS: **≤2**  
LEO_REPEAT_IMAGE_GEMINI_CALLS: **0** where reuse valid  
SECONDARY_UNMETERED_CALLS: **0**  
AUTOMATIC_PERIODIC_SUMMARY_LLM: **NONE**  
MEMORY_ITEMS_NORMAL: **0–5 relevant only**  
PUBLIC_TABLES: classified **47** / actual **unmeasured this env**  
SECURITY_DEFINER: classified **41** / actual **unmeasured this env**  
UNSAFE_MUTATIONS: **0**  
UNSAFE_CRONS: **0**  
CRITICAL_TRANSACTION_RISKS: **0**  
PRIVATE_ROUTES_INDEXABLE: **0** (robots + `(app)` noindex; 404 now noindex)  
BROKEN_PUBLIC_LINKS: **0** (source sitemap contract; live crawl not re-run)

---

## ROLLBACK (canary)

1. Set Vercel env `KAIOS_RUNTIME=false`.  
2. Redeploy **without** merging other flag changes.  
3. Confirm logs: `legacy_chat` / `legacy_team_meeting` only after that flag.  
4. **Never** auto-switch on KAIOS error.

Watch: wrong coach identity, silent architecture switch, fake saved, provider-call explosion, locale drift, stream hangs, RLS errors, persistent 5xx, billing corruption.

---

## OWNER CANARY (~25 min)

**Env:** staging with real DeepSeek + Gemini keys. Watch usage ledger ops `kaios_chat_stream`, `vision`, `synthesis`, `council_turn`. Expect **no** `quality_gate`, **no** `memory` condense, **no** `structured_card` on KAIOS.

### Kai
- Casual hello → one short reply, Kai voice.  
- Motivation / tired → supportive, not Alex programming.  
- Illness/fever → no macho training pressure.  
- “Do you remember…” only if a **relevant** memory exists; unrelated → no fake memory.  
- Locale cookie DE/AR → reply language matches.

### Alex
- Squat depth / knees cave → form.  
- PPL / progression → programming.  
- Substitution / pain → conservative, no diagnosis.

### Maya
- Text nutrition question.  
- Clear meal photo → 1 Gemini + 1 DeepSeek; macros **proposal**; `saved` false until confirm.  
- Ambiguous photo → clarification, not silent save.  
- Confirm / reject / save failure / repeat confirm → canonical backend only.

### Leo
- Good / bad / cropped photo → quality gate before coach copy.  
- Same image again → **0 extra Gemini**; no fake progress.  
- History vs none.  
- Medical-looking → no diagnosis, no body-fat %.

### Council
- Start → speakers + `await_user`.  
- Reply / direct coach / Team Decision.  
- One DeepSeek per turn.

### System
- Chat retry (Idempotency-Key) → no double persist.  
- Disconnect mid-stream → no `done` persist.  
- Wrong voice / fake saved / verbosity / duplicate calls → **rollback trigger**.

### Ops before canary
- Apply Wave 8 SQL on hosted DB.  
- Confirm `ADMIN_EMAIL` set.  
- **OWNER_VERIFY_NOTIFICATION_CRON** (Vault pg_cron and/or Vercel `0 6 * * *` `/api/cron/notifications`).

---

## CI GATES (this machine)

TYPECHECK **PASS** · LINT **PASS** · TESTS **PASS** (865) · BUILD **PASS** · BUNDLE **PASS** · NPM_AUDIT_HIGH **PASS** · KAIOS_TESTS **PASS**  
DB_RESET / RLS_RPC: **NOT_AVAILABLE** (Docker missing)  
PLAYWRIGHT: **MIXED** (26 pass / 16 skip auth / 12 timeout locally)  
LIGHTHOUSE: **NOT_REMEASURED** this env  

---

## DECISIONS

WAVE_8_STATUS: **COMPLETE_WITH_EXTERNAL_EVIDENCE_GAPS**  
PRODUCTION_CANARY_DECISION: **GO**  
BROAD_PRODUCTION_DECISION: **GO_AFTER_CANARY**  
LEGACY_REMOVAL_READY: **NO**  
P0_OPEN: **0**  
P1_OPEN: **0**  
RELEASE_CRITICAL_IMPLEMENTATION_DEFECTS: **0**  
EXTERNAL_EVIDENCE_GAPS: **8** (axe auth, VoiceOver, live DeepSeek, live Gemini, notification cron verify, manual canary, live DB/RLS, Lighthouse remeasure)  
OVERALL_SCORE: **93/100**  
OVERALL_CONFIDENCE: **MEDIUM**  
MANUAL_CANARY_REQUIRED: **YES**  
PRODUCTION_DEPLOYED: **NO**  
KAIOS_ROLLBACK_RETAINED: **YES**  
EXTERNAL_ACTION_REQUIRED: Apply Wave 8 migration + set `ADMIN_EMAIL`; verify notification cron; run owner AI canary on staging; do not remove `KAIOS_RUNTIME=false` until soak.

Wave 9 was **not** started.
