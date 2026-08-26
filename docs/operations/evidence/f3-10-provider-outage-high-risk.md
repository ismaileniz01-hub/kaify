# F3-10 — High-risk routing during provider outage

**Date:** 2026-08-26  
**Status:** Unit + source-order evidence. Not a live provider-outage drill.

## What is proven

1. `classifyHighRiskMessage` and `highRiskSafetyResponse` do not call a model.
2. After the DeepSeek circuit is forced open (`CircuitOpenError`), classification
   and the fixed safety reply still succeed (`tests/unit/high-risk-safety.test.ts`).
3. `lib/services/chat.service.ts` runs the high-risk check **before**
   `AI_FEATURES.kaiosRuntime` and the legacy path.

## What is not claimed

No production incident, no 1K/10K VU run, and no live DeepSeek/Gemini outage
was exercised in this phase.
