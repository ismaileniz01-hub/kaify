# KAIOS Migration Report (Release-Audit Closeout)

## Release decisions

| Gate | Decision |
| --- | --- |
| **CANARY_RELEASE_DECISION** | **GO** |
| **BROAD_PRODUCTION_DECISION** | **GO_WITH_FIXES** |

**Canary rationale:** Default runtime is KAIOS; no automatic KAIOS→legacy fallback; user-scoped tool/write paths have explicit cross-user backend rejection tests; event buffer is not the sole source of truth for critical product state; intentional soak flag is observable and explicitly gated.

**Broad production rationale:** After successful soak, remove legacy runtime + `KAIOS_RUNTIME` flag (planned). Remaining items are P2 reliability (durable event outbox for fan-out/rebuild) and known product limitations (no trusted nutrition catalog; deferred UI polish) — not blockers for controlled canary.

---

## Final architecture

- **Design-time:** 17 verbatim specs under `kaios/source/` (never runtime-injected).
- **Runtime:** densified capsules in `lib/kaios/capsules/` → Context Builder → Prompt Compiler (`safety → core → coach/task → locale → trusted → knowledge → output → history → user`) → Orchestrator (single conversational inference).
- **Vision:** Gemini observation-only → `NutritionDataProvider` / Leo scores → coach synthesis via capsules.
- **Council:** interactive `runCouncilTurn` with `await_user`, Team Decision persistence on message payload + best-effort `council_decision` event.
- **Tools:** authorized router (`lib/kaios/tools`) — server-owned `userId`, meal writes pending-confirm only, exercise search/ID validation, hydration write + best-effort event.
- **Events:** deterministic `emitKaiosEvent` / `emitKaiosEventBestEffort` / `applyKaiosEvent`. In-process buffer is **not** canonical SoT.
- **Feature control:** `AI_FEATURES.kaiosRuntime` (`KAIOS_RUNTIME`, default **true**).

## Source-spec compliance

| Spec area | Status |
| --- | --- |
| Constitution / hierarchy | Safety+core always compiled; precedence regression tests |
| Capsules not full `.md` | Enforced by `no-full-spec-runtime` + prompt audit |
| Memory sanitize ≤5 | Implemented + tested |
| Localization resolve / short expressions / TR casing | Code helpers + capsule rules + tests |
| Output contracts / envelopes | Zod schemas; structured parse failure → text, no fake card |
| Nutrition provenance honesty | `model_estimate` only without catalog |
| Tools + confirmation | Pending bind, 24h expiry, idempotent confirm |
| Council interactive / await_user | Implemented; decision persisted on messages |
| Token economy intent ceilings | `outputBudgetFor`; casual ≤80 etc. |
| Testing & release matrix | See coverage mapping below |

## Exact legacy paths removed (from KAIOS-enabled production)

While `KAIOS_RUNTIME=true` (default), these are **not** on the request path:

| Legacy behavior | KAIOS replacement |
| --- | --- |
| `COACH_CHAT_VOICE` + DB personality injection | Capsules only |
| `syncAgents` prose injection | Compact `teamFacts` |
| `structured-chat` second LLM card call | Same-inference envelope; hard-stop when KAIOS on |
| One-shot fake team meeting voices | Interactive Council turns |
| Gemini-as-coach speech | Observation prompts |

**No hidden fallback:** `streamCoachReply` returns from the KAIOS branch on success or SSE `error`; it never falls into legacy personalities after a KAIOS failure.

## Exact legacy paths still temporarily retained (soak)

Intentional controlled rollback only (`KAIOS_RUNTIME=false`):

| File / symbol | Why retained | Removal condition |
| --- | --- | --- |
| `lib/services/chat.service.ts` legacy branch | Explicit env rollback during canary soak | Delete after successful soak + zero rollback need |
| `lib/ai/personas.ts` chat voice builders | Legacy chat path | Remove chat voice builders after soak |
| `lib/ai/structured-chat.ts` | Rollback card generation | Delete after soak |
| `lib/services/coaching.service.ts` `syncAgents` | Legacy chat only | Delete or narrow after soak |
| `lib/services/team-chat.service.ts` oneshot path when flag false | Rollback | Delete after soak |

**Observability:** entering legacy logs `kaios.runtime.rollback_active` (`legacy_chat` / `legacy_team_meeting`).

**Accidental entry while KAIOS enabled?** No — single early `if (AI_FEATURES.kaiosRuntime) { … return; }`.

**Classification:** presence of this intentional soak flag is **not** a P1 during canary.

## Event durability invariant

Verified:

| Critical state | Canonical store (survives process restart) | In-memory event buffer role |
| --- | --- | --- |
| Meal saved | `confirm_analytics_pending` RPC → analytics tables | Best-effort `meal_saved` hint only |
| Hydration | `patchAnalyticsDaily` → analytics_daily | Best-effort `hydration_recorded` |
| Physique analysis | `chat_messages` (`message_type=score`) + fingerprint | Best-effort `physique_scored` |
| Council Team Decision | `chat_messages.payload.data.decision` | Best-effort `council_decision` |

Post-write emission uses `emitKaiosEventBestEffort` so event/memory failures **cannot** undo or falsely block reporting of a successful canonical write. Failed canonical writes return `ok:false` / ApiError (no fake success).

Event-derived memory remains rebuildable/retryable from durable rows; buffer clear does not erase product state.

→ Durable cross-instance event outbox is a **P2 reliability improvement**, not a P1 correctness defect.

## Remaining stubs / limitations (explicit)

1. **No trusted food catalog/API** → macros are `model_estimate` only.
2. **Event buffer** in-process (fan-out/rebuild convenience only; see invariant above).
3. **Live provider token before/after** not fabricated in CI.
4. **Leo radial / premium Council chrome** deferred (UI).
5. **`KAIOS_RUNTIME=false` soak flag** temporary — remove after soak (not a canary P1).

## Tool / event implementation status

| Capability | Status |
| --- | --- |
| Maya pending meal confirm → authorized save | **Done** |
| Confirmation bound to message | **Done** |
| Confirmation expiry (24h) | **Done** |
| Server-owned user identity on tools | **Done** + security tests |
| Write idempotency (confirm) | **Done** + tests |
| Exercise search + ID validation | **Done** |
| Structured events after state changes | **Done** (best-effort after canonical write) |
| Memory updates from events | **Done** (best-effort) |
| Council decision persistence | **Done** (message payload) |
| Tool failure → no fake success | **Done** + tests |
| Leo same-image score reuse | **Done** |
| Cross-user rejection on writes | **Done** (`tests/kaios/tool-authorization.test.ts`) |

## Test coverage mapping (`16_testing_and_release.md`)

| Release-critical behavior | Coverage |
| --- | --- |
| No full-spec runtime injection | `no-full-spec-runtime.test.ts` |
| One active coach identity | `compiler.test.ts`, `identity-context.test.ts`, prompt audit |
| Persona leakage | `identity-context.test.ts` |
| Character stability | `identity-context.test.ts` + capsules |
| Fake memory prevention / poisoning | `memory.test.ts` |
| Structured memory retrieval bounds | `memory.test.ts` (≤5) |
| Canonical state precedence | `identity-context.test.ts` |
| **Cross-user/tool authorization** | **`tool-authorization.test.ts`** (meal confirm, hydration, nutrition read, physique history, client `userId` strip, invalid schema, duplicate confirm, write-fail→no fake success, council history ownership) |
| Pending-action binding | coach-analytics link + confirmation service + auth tests |
| Expired confirmation | `production-gaps.test.ts` |
| Tool failure / no fake success | `production-gaps.test.ts` + `tool-authorization.test.ts` |
| Invalid exercise-ID rejection | `exercise-ids.test.ts` + tools |
| Maya confirmation-before-save | capsules + tools `saveMealMacros` pending |
| Maya `model_estimate` provenance | `nutrition.test.ts`, schemas |
| Leo invalid-image rejection | quality gate |
| Leo same-image / historical stability | fingerprint + `production-gaps.test.ts` |
| Council `await_user` / no fake user speakers | `production-gaps.test.ts` |
| Language-switch / short-expression / TR casing | localization tests |
| Long-history bounded context | `identity-context.test.ts` |
| Stale-cache invalidation | confirm → `invalidateHomeBundleCache` |
| Schema failure recovery | orchestrator text fallback |
| Prompt/token regression | baselines + ceilings |
| No second LLM structured-card call | hard-stop + tests |
| Compiler precedence (safety wins) | `precedence.test.ts` |
| Event durability invariant | `tool-authorization.test.ts` |
| Soak flag gating / observability | `soak-flag.test.ts` |

## Test results

This closeout pass: `npx vitest run tests/kaios` → **86 passed** (15 files). Typecheck clean; `lint:strict` clean; build succeeded.

## Prompt / context audit findings

Artifact: `kaios/audit/runtime-prompt-audit.json` (synthetic fixtures only).

## Token baseline and telemetry readiness

- Static baselines: `kaios/baseline/pre-migration.json`, `post-migration.json`.
- Runtime telemetry ready for provider usage when credentials return usage.
- Intent ceilings remain specific under KAIOS.

## Nutrition-data limitation

No catalog → `ModelEstimateProvider` only. Honest `model_estimate` provenance; no invented food DB.

## Rollback status (soak)

- Default: **KAIOS on**.
- Legacy: **only** `KAIOS_RUNTIME=false` (explicit config).
- Observable via `kaios.runtime.rollback_active`.
- Removal: after successful soak, delete legacy branches and lock flag on / remove env override.
- **Not classified as P1** during ongoing canary.

## P0 issues

_None open for supported workflows._

## P1 issues

_None._ (Prior “durable event store” and “soak flag present” items reclassified per this audit.)

## P2 issues

1. **Durable cross-instance event outbox** — reliability improvement for fan-out/rebuild; not required for canonical SoT.
2. Live provider token A/B capture still blocked without CI credentials.
3. Capsule densification can continue iteratively without architecture redesign.
4. Deprecated AI flag mirrors in `feature-flags.ts` (prefer `AI_FEATURES`).
5. **Post-soak:** remove legacy runtime path + `KAIOS_RUNTIME` rollback switch.

## P3 issues

1. Leo radial redesign deferred.
2. Premium Council UI chrome deferred.
3. Optional trusted nutrition catalog/provider when product data exists.

---

## End

**CANARY_RELEASE_DECISION: GO**  
**BROAD_PRODUCTION_DECISION: GO_WITH_FIXES**
