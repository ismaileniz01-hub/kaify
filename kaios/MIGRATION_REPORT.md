# KAIOS Migration Report (Final Production-Completion Pass)

## Release decision

**GO WITH FIXES**

Rationale: Canonical KAIOS runtime is the default production path, tool/event/confirmation gaps for supported Kaify workflows are closed, legacy personality injection has no hidden fallback while KAIOS is enabled, and release-critical tests map to `16_testing_and_release.md`. Remaining items are explicit product limitations (nutrition catalog, durable event store, temporary soak rollback flag) or deferred UI polish — not silent stubs pretending completeness.

---

## Final architecture

- **Design-time:** 17 verbatim specs under `kaios/source/` (never runtime-injected).
- **Runtime:** densified capsules in `lib/kaios/capsules/` → Context Builder → Prompt Compiler (`safety → core → coach/task → locale → trusted → knowledge → output → history → user`) → Orchestrator (single conversational inference).
- **Vision:** Gemini observation-only → `NutritionDataProvider` / Leo scores → coach synthesis via capsules.
- **Council:** interactive `runCouncilTurn` with `await_user`, Team Decision persistence on message payload + `council_decision` event.
- **Tools:** authorized router (`lib/kaios/tools`) — server-owned `userId`, meal writes pending-confirm only, exercise search/ID validation, hydration write + event.
- **Events:** deterministic `emitKaiosEvent` / `applyKaiosEvent` with memory hints (in-process buffer + best-effort `coaching_memory` rows).
- **Feature control:** `AI_FEATURES.kaiosRuntime` (`KAIOS_RUNTIME`, default **true**). Product AI flags live in `AI_FEATURES` (not duplicated as a second authority in `feature-flags.ts`).

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
| Council interactive / await_user | Implemented; decision persisted |
| Token economy intent ceilings | `outputBudgetFor`; casual ≤80 etc. |
| Testing & release matrix | See coverage mapping below |

## Exact legacy paths removed (from KAIOS-enabled production)

While `KAIOS_RUNTIME=true` (default), these are **not** on the request path:

| Legacy behavior | KAIOS replacement |
| --- | --- |
| `COACH_CHAT_VOICE` + DB personality injection | Capsules only |
| `syncAgents` prose injection | Compact `teamFacts` |
| `structured-chat` second LLM card call | Same-inference envelope; hard-stop guard in `maybeGenerateStructuredCard` when KAIOS on |
| One-shot fake team meeting voices | Interactive Council turns |
| Gemini-as-coach speech | Observation prompts |

**No hidden fallback:** `streamCoachReply` returns from the KAIOS branch on success or SSE `error`; it never falls into legacy personalities after a KAIOS failure.

## Exact legacy paths still temporarily retained

Soak rollback only (`KAIOS_RUNTIME=false`):

| File / symbol | Why retained | Removal condition |
| --- | --- | --- |
| `lib/services/chat.service.ts` legacy branch | Explicit env rollback during soak | Delete after soak + zero rollback need |
| `lib/ai/personas.ts` (`COACH_CHAT_VOICE`, `buildChatSystemPrompt`, analysis personas for synthesis labels) | Legacy chat + shared persona ids for vision coach mapping | Remove chat voice builders after soak; keep minimal persona id map if still needed for Maya/Leo routing |
| `lib/ai/structured-chat.ts` | Rollback card generation | Delete after soak |
| `lib/services/coaching.service.ts` `syncAgents` | Legacy chat only | Delete or narrow after soak |
| `lib/services/team-chat.service.ts` oneshot path when flag false | Rollback | Delete after soak |

**Accidental entry while KAIOS enabled?** No — gated by a single early `if (AI_FEATURES.kaiosRuntime)`.

## Remaining stubs / limitations (explicit)

1. **No trusted food catalog/API** → macros are `model_estimate` only (honest; not invented tables).
2. **Event buffer** is in-process (not durable cross-instance); memory hints best-effort insert.
3. **Live provider token before/after** not fabricated in CI (no API keys); telemetry fields ready when usage is returned.
4. **Leo radial / premium Council chrome** deferred (UI), not a runtime stub.
5. **`KAIOS_RUNTIME=false` soak flag** temporary — not final architecture.

## Tool / event implementation status

| Capability | Status |
| --- | --- |
| Maya pending meal confirm → authorized save | **Done** (`confirm_analytics_pending` RPC + expiry) |
| Confirmation bound to message | **Done** (`linkPendingConfirmationToMessage`) |
| Confirmation expiry (24h) | **Done** |
| Server-owned user identity on tools | **Done** (strips client `userId`) |
| Write idempotency (confirm) | **Done** (status-gated) |
| Exercise search + ID validation | **Done** |
| Structured events after state changes | **Done** (meal/hydration/physique/council) |
| Memory updates from events | **Done** (hints → coaching_memory best-effort) |
| Council decision persistence | **Done** (payload + event) |
| Tool failure → no fake success | **Done** (`ok:false` codes; capsules forbid fake saves) |
| Leo same-image score reuse | **Done** (vision fingerprint) |
| Leo invalid-image rejection | **Done** (quality gate) |

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
| Cross-user/tool authorization | tools strip `userId` (code) + exercise tool tests |
| Pending-action binding | coach-analytics link + confirmation service |
| Expired confirmation | `production-gaps.test.ts` |
| Tool failure / no fake success | `production-gaps.test.ts` exercise reject |
| Invalid exercise-ID rejection | `exercise-ids.test.ts` + tools |
| Maya confirmation-before-save | capsules + tools `saveMealMacros` pending |
| Maya `model_estimate` provenance | `nutrition.test.ts`, schemas |
| Leo invalid-image rejection | quality gate (existing analysis path) |
| Leo same-image stability | fingerprint helpers + `production-gaps.test.ts` |
| Leo historical score stability | prior scores + fingerprint reuse |
| Council `await_user` | `production-gaps.test.ts` schema parse |
| No fake Council user responses | speakers enum coaches only |
| Council relevant-speakers | capsule rules + turn prompt |
| Language-switch / short-expression | `localization/resolve` + tests |
| Turkish casing | `production-gaps.test.ts` |
| Long-history bounded context | `identity-context.test.ts` |
| Stale-cache invalidation | confirm path calls `invalidateHomeBundleCache` |
| Schema failure recovery | orchestrator text fallback (no fake structured success) |
| Prompt/token regression | baselines + compiler token bounds + ceilings test |
| No second LLM structured-card call | hard-stop + `production-gaps.test.ts` |
| Compiler precedence (safety wins) | `precedence.test.ts` |

## Test results

Run locally in this pass: `npx vitest run tests/kaios` → **62 passed** (13 files). Typecheck clean; `lint:strict` clean. Baselines + prompt audit artifacts updated/generated.

## Prompt / context audit findings

Artifact: `kaios/audit/runtime-prompt-audit.json` (synthetic fixtures only).

Verified for Kai casual, Alex Q, Alex program, Maya nutrition, Maya vision, Leo analysis, Council turn:

- Source markdown absent
- One active coach identity
- One locale pack
- Irrelevant memory absent on casual tier
- Unrelated coach capsules absent
- Intent-specific output budgets

## Token baseline and telemetry readiness

- Static baselines retained: `kaios/baseline/pre-migration.json`, `post-migration.json`.
- Runtime telemetry (`lib/kaios/telemetry/tokens.ts`) records when provider usage exists: input/output/total, cache hit/miss, model call count, vision call count, latency, coach, intent.
- Intent ceilings remain specific (e.g. casual 80); routine paths cannot silently use legacy ~900–1800 card ceilings under KAIOS.
- **Live measurements not fabricated** in this environment.

## Nutrition-data limitation

No catalog → `ModelEstimateProvider` only. Observation macros tagged `model_estimate`. Missing macros fail honestly (no invented food DB).

## Rollback status

- **Temporary soak:** `KAIOS_RUNTIME=false` still reaches legacy chat/team/card paths.
- **Final target:** delete those branches after soak; lock `kaiosRuntime` on.
- Documented above; **not** treated as final architecture.

## P0 issues

_None open for supported workflows._ (Nutrition catalog absence is an explicit limitation, not a silent defect.)

## P1 issues

1. Durable cross-instance event log / outbox still absent (in-process buffer only).
2. Soak rollback flag still present — remove after production soak evidence.

## P2 issues

1. Live provider token A/B capture still blocked without CI credentials.
2. Capsule densification vs full YAML density can continue iteratively without architecture redesign.
3. Duplicate deprecated mirrors in `feature-flags.ts` for AI_STRUCTURED_CARDS / AI_CHAT_ANALYTICS (documented; prefer `AI_FEATURES`).

## P3 issues

1. Leo radial redesign deferred.
2. Premium Council UI chrome deferred.
3. Optional trusted nutrition catalog/provider wiring when product data exists.

---

## End

**GO WITH FIXES**
