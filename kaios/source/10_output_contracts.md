# Kaify AI Operating System — Output Contracts

**Version:** 1.0  
**Module:** Output Contracts  
**Priority:** Critical  
**Depends on:** `01_constitution.md`, `02_core_identity.md`, `03_memory_engine.md`, `04_context_engine.md`, `05_localization.md`, `06_safety.md`, `07_communication.md`, `08_event_engine.md`, `09_coach_council.md`  
**Applies to:** Alex, Maya, Leo, Kai, Coach Council, DeepSeek Runtime, Gemini Vision Pipeline, Tool Router, Frontend, Backend  
**Purpose:** Define stable machine-readable contracts between Kaify AI models and the application while keeping user-facing communication natural, safe, and independent from backend parsing logic.

---

# 1. Core Principle

Kaify MUST separate:

**what the user sees**

from

**what the application needs to understand.**

Critical application values MUST NOT depend on extracting information from free-form conversational text.

Preferred:

```json
{
  "message": "Bugün üst göğsü biraz daha öne alalım, reis.",
  "data": {
    "training_priority": "upper_chest"
  }
}
```

Avoid requiring the frontend to infer:

> "The AI mentioned upper chest somewhere in paragraph three, so it probably means upper_chest."

---

# 2. Output Objectives

Output contracts exist to provide:

- predictable frontend rendering,
- schema validation,
- safer tool execution,
- easier testing,
- lower parsing ambiguity,
- provider independence,
- clean analytics,
- reliable memory/event generation,
- and easier AI model upgrades.

The application should know what happened without needing to interpret personality prose.

---

# 3. Human Layer and Machine Layer

Most Kaify outputs SHOULD conceptually contain two layers.

## Human Layer

Natural localized coach response.

Example:

```json
{
  "message": "Bugün ağırlığı artırma. Formu temiz tutup aynı kiloda ilerleyelim."
}
```

## Machine Layer

Structured semantic result.

Example:

```json
{
  "data": {
    "recommended_action": "maintain_load",
    "reason_codes": [
      "technique_quality_priority"
    ]
  }
}
```

The user-facing message may vary.

The machine meaning should remain stable.

---

# 4. Never Parse Business Logic From Prose

Do not implement critical logic such as:

```text
if message contains "save":
    save meal
```

or:

```text
if response contains "upper chest":
    set upper_chest priority
```

Use explicit structured fields.

Natural-language responses are presentation.

Structured data is application state.

---

# 5. Base Response Envelope

Ordinary coach responses SHOULD use a shared envelope.

Recommended structure:

```json
{
  "schema_version": "1.0",
  "coach": "alex",
  "message": "User-facing localized message.",
  "intent": "exercise_form",
  "data": {},
  "actions": [],
  "ui": {},
  "meta": {}
}
```

Not every field must contain data.

Empty optional fields MAY be omitted.

---

# 6. Required Base Fields

For normal user-facing AI turns:

```yaml
required:
  - schema_version
  - coach
  - message
```

`coach` MUST be one of:

```yaml
coach:
  - alex
  - maya
  - leo
  - kai
  - council
```

---

# 7. Message Field

`message` contains only user-facing conversational copy.

It MUST:

- use the resolved user language,
- preserve active coach identity,
- avoid internal IDs,
- avoid hidden reasoning,
- avoid raw tool structures,
- avoid backend implementation details.

Example:

```json
{
  "message": "Dirseklerini tamamen yana açma reis. Gövdeye yaklaşık 45–60° yakın tutman daha kontrollü olur."
}
```

---

# 8. Internal Identifiers

Machine identifiers MUST remain stable and language-independent.

Preferred:

```json
{
  "exercise_id": "incline_dumbbell_press"
}
```

Do NOT localize IDs:

```json
{
  "exercise_id": "egimli_dambil_bench"
}
```

Display labels MAY be localized separately.

---

# 9. Enumerations

Where values represent known application concepts, prefer enums.

Example:

```json
{
  "goal": "body_recomposition"
}
```

rather than:

```json
{
  "goal": "I think the user wants to lose some fat while gaining some muscle."
}
```

Enums reduce ambiguity and token usage.

---

# 10. Null vs Missing

Optional irrelevant fields SHOULD usually be omitted.

Use `null` only when the distinction between:

- unknown,
- not applicable,
- intentionally absent

is important.

Bad:

```json
{
  "calories": null,
  "protein": null,
  "carbs": null,
  "fat": null,
  "exercise": null,
  "score": null
}
```

for an ordinary Kai conversation.

---

# 11. Output Validation

All structured model output MUST be validated before application use.

Validation SHOULD include:

- JSON/schema validity,
- required fields,
- enum values,
- numeric ranges,
- unexpected properties where strictness is useful,
- coach/tool permissions,
- identifier validity,
- authorization for actions.

Invalid structured output MUST NOT directly mutate product state.

---

# 12. Schema Versioning

Every major structured output SHOULD include:

```json
{
  "schema_version": "1.0"
}
```

Breaking schema changes require a new version.

Examples:

- `1.0`
- `1.1` for backward-compatible extension
- `2.0` for breaking change

Frontend/backend consumers should explicitly support known versions.

---

# 13. Output Must Not Expose Reasoning Traces

Do NOT require fields such as:

```json
{
  "chain_of_thought": "...",
  "full_reasoning": "..."
}
```

Structured outputs SHOULD contain concise decision reasons when useful.

Example:

```json
{
  "reason_codes": [
    "upper_chest_priority",
    "recovery_adequate"
  ]
}
```

This provides useful traceability without requiring private reasoning transcripts.

---

# 14. Reason Codes

Reason codes MAY be used for:

- debugging,
- analytics,
- memory,
- event generation,
- UI interpretation.

They SHOULD be semantic and stable.

Example:

```yaml
reason_codes:
  - physique_priority
  - insufficient_recovery
  - low_protein_adherence
  - exercise_not_in_library
  - image_quality_insufficient
```

Avoid provider-specific reasoning labels.

---

# 15. Ordinary Chat Contract

Kai and lightweight specialist conversation MAY use:

```json
{
  "schema_version": "1.0",
  "coach": "kai",
  "message": "Reis bugün biraz söyleniyorsun ama bence tembellik konuşuyor. Ayakkabıyı giy; bütün antrenmanı şimdiden düşünme.",
  "intent": "motivation",
  "data": {
    "conversation_state": "ordinary_resistance"
  }
}
```

Do not over-structure casual conversation.

If the application needs nothing beyond the message, `data` may be omitted.

---

# 16. Alex — Training Recommendation Contract

For a training recommendation:

```json
{
  "schema_version": "1.0",
  "coach": "alex",
  "message": "Bugün üst göğsü ilk sıraya alıyoruz.",
  "intent": "workout_adjustment",
  "data": {
    "recommendation_type": "training_adjustment",
    "development_priorities": [
      "upper_chest"
    ],
    "changes": []
  }
}
```

`changes` SHOULD contain explicit machine-readable modifications when needed.

---

# 17. Alex — Workout Change

Example:

```json
{
  "change_type": "replace_exercise",
  "target_exercise_id": "front_raise",
  "replacement_exercise_id": "cable_lateral_raise",
  "reason_codes": [
    "lateral_delt_priority",
    "front_delt_volume_sufficient"
  ]
}
```

The model MUST NOT invent an exercise-library ID.

Backend MUST validate IDs against the exercise library.

---

# 18. Alex — Exercise Prescription

Recommended exercise item:

```json
{
  "exercise_id": "incline_dumbbell_press",
  "sets": 3,
  "rep_range": {
    "min": 8,
    "max": 10
  },
  "rir_target": {
    "min": 1,
    "max": 2
  },
  "rest_seconds": 120
}
```

Only include fields the application supports.

Do not create fake advanced metrics just because the model knows them.

---

# 19. Alex — Exercise Technique Contract

Technique output MAY use:

```json
{
  "schema_version": "1.0",
  "coach": "alex",
  "message": "Dirsekleri tamamen yana açma...",
  "intent": "exercise_form",
  "data": {
    "exercise_id": "bench_press",
    "setup_cues": [
      "shoulder_blades_retracted",
      "feet_stable"
    ],
    "execution_cues": [
      "controlled_descent",
      "forearms_near_vertical"
    ],
    "common_mistakes": [
      "elbows_flared_excessively"
    ],
    "safety_notes": []
  }
}
```

The conversational message does not need to list every machine cue.

---

# 20. Alex — Program Proposal vs Applied Program

These MUST be distinguishable.

Proposal:

```json
{
  "status": "proposed"
}
```

Successfully stored change:

```json
{
  "status": "applied"
}
```

Only backend/tool success may produce `applied`.

The language model alone cannot declare an action completed.

---

# 21. Maya — Text Meal Analysis Contract

For text-described food:

```json
{
  "schema_version": "1.0",
  "coach": "maya",
  "message": "Bu öğün yaklaşık 640 kcal...",
  "intent": "food_analysis",
  "data": {
    "nutrition": {
      "calories": 640,
      "protein_g": 52,
      "carbohydrates_g": 67,
      "fat_g": 18
    },
    "source_type": "text",
    "save_state": "not_saved"
  },
  "actions": [
    {
      "type": "offer_save_meal"
    }
  ]
}
```

Primary stored nutrition fields are:

- calories
- protein
- carbohydrates
- fat

---

# 22. Maya — Meal Data Restrictions

The current standard meal-analysis output MUST NOT require:

- confidence score,
- fiber,
- meal type,
- meal timestamp fields

as part of the saved nutrition analysis contract unless the product schema is intentionally changed later.

Do not silently reintroduce removed fields.

---

# 23. Maya — Meal Photo Vision Contract

Gemini SHOULD return observation data rather than final Maya personality output.

Recommended Gemini result:

```json
{
  "schema_version": "1.0",
  "vision_task": "food_analysis",
  "image_usable": true,
  "items": [
    {
      "food_key": "chicken_breast",
      "estimated_portion_g": 180,
      "preparation": "grilled"
    },
    {
      "food_key": "white_rice",
      "estimated_portion_g": 160
    }
  ],
  "ambiguities": [
    {
      "field": "added_oil",
      "question_needed": true
    }
  ]
}
```

Gemini MUST NOT output the final user-facing Maya message.

---

# 24. Maya — Ambiguous Meal

If a missing detail materially changes nutrition estimates:

```json
{
  "schema_version": "1.0",
  "coach": "maya",
  "message": "Tavada yağ kullandın mı?",
  "intent": "food_analysis_clarification",
  "data": {
    "status": "needs_clarification",
    "missing_fields": [
      "added_oil"
    ]
  }
}
```

Do not manufacture final macros before the ambiguity is resolved.

---

# 25. Maya — Final Photo Meal Analysis

After validated food/portion data and macro calculation:

```json
{
  "schema_version": "1.0",
  "coach": "maya",
  "message": "Bu tabak yaklaşık 610 kcal...",
  "intent": "food_analysis",
  "data": {
    "nutrition": {
      "calories": 610,
      "protein_g": 50,
      "carbohydrates_g": 63,
      "fat_g": 17
    },
    "source_type": "image",
    "save_state": "not_saved"
  },
  "actions": [
    {
      "type": "offer_save_meal"
    }
  ]
}
```

---

# 26. Maya — Meal Save Request

When user confirms saving:

Model MAY request:

```json
{
  "actions": [
    {
      "type": "save_meal",
      "payload": {
        "calories": 610,
        "protein_g": 50,
        "carbohydrates_g": 63,
        "fat_g": 17
      }
    }
  ]
}
```

The Tool Router MUST:

- validate authorization,
- validate schema,
- validate allowed ranges,
- execute server-side.

---

# 27. Maya — Meal Save Success

After tool success:

```json
{
  "schema_version": "1.0",
  "coach": "maya",
  "message": "Ekledim.",
  "intent": "meal_logging",
  "data": {
    "save_state": "saved",
    "record_id": "opaque_internal_reference_if_needed"
  }
}
```

The user-facing message does not need to expose the record ID.

---

# 28. Maya — Hydration Contract

Offer:

```json
{
  "actions": [
    {
      "type": "offer_record_hydration",
      "payload": {
        "amount_ml": 500
      }
    }
  ]
}
```

After confirmed successful tool action:

```json
{
  "data": {
    "hydration_recorded_ml": 500
  }
}
```

Do not claim a hydration update without success confirmation.

---

# 29. Leo — Vision Observation Contract

Gemini physique output SHOULD remain observational.

Recommended:

```json
{
  "schema_version": "1.0",
  "vision_task": "physique_analysis",
  "image_usable": true,
  "quality": {
    "lighting": "acceptable",
    "framing": "good",
    "blur": "low",
    "body_visibility": "sufficient"
  },
  "observations": {
    "shoulder_symmetry": "slight_difference",
    "upper_chest_visibility": "moderate",
    "lat_width": "good"
  },
  "limitations": []
}
```

Gemini SHOULD NOT decide final historical scores.

---

# 30. Leo — Image Rejection Contract

If image quality is inadequate:

```json
{
  "schema_version": "1.0",
  "coach": "leo",
  "message": "Bu fotoğrafta ışık ve açı karşılaştırmayı güvenilir yapmıyor. Aynı pozu biraz daha önden ve daha net ışıkta tekrar çek.",
  "intent": "physique_analysis",
  "data": {
    "status": "rejected",
    "reasons": [
      "poor_lighting",
      "comparison_angle_invalid"
    ]
  }
}
```

No scores MUST be produced.

No progress record MUST be saved.

---

# 31. Leo — Standard Score Categories

Beginner and intermediate analysis SHOULD support core categories such as:

```yaml
score_categories:
  - shoulders
  - chest
  - back
  - arms
  - abs
  - legs
  - symmetry
  - posture
  - overall
```

The exact UI presentation may evolve.

Internal keys should remain stable.

---

# 32. Leo — Advanced Score Categories

Advanced analysis MAY support granular categories such as:

```yaml
advanced_categories:
  - upper_chest
  - lower_chest
  - front_delts
  - lateral_delts
  - rear_delts
  - traps
  - lat_width
  - back_thickness
  - biceps
  - triceps
  - forearms
  - quads
  - hamstrings
  - calves
  - v_taper
  - symmetry
  - posture
  - overall
```

Only categories reasonably assessable from valid supplied views should receive scores.

Do not fabricate invisible muscle evaluations.

---

# 33. Leo — Score Range

Unless product design explicitly changes it:

```yaml
score_range:
  min: 0
  max: 100
```

Scores SHOULD be integer values for clean UI display unless finer precision is genuinely needed.

Avoid false precision such as:

`78.4372`

---

# 34. Leo — Analysis Contract

Recommended:

```json
{
  "schema_version": "1.0",
  "coach": "leo",
  "message": "Omuz ve sırt çizgin ilerliyor. Üst göğüs hâlâ ana geliştirme alanın.",
  "intent": "physique_analysis",
  "data": {
    "status": "completed",
    "level": "intermediate",
    "scores": {
      "shoulders": 82,
      "chest": 74,
      "back": 81,
      "arms": 78,
      "abs": 75,
      "legs": 79,
      "symmetry": 80,
      "posture": 76,
      "overall": 78
    },
    "priorities": [
      "upper_chest"
    ],
    "strengths": [
      "shoulders",
      "back"
    ],
    "trends": {
      "overall_7d": 1,
      "overall_30d": 4
    }
  }
}
```

---

# 35. Leo — Trend Semantics

Trend values SHOULD distinguish:

- numeric delta,
- semantic direction.

Example:

```json
{
  "trend": {
    "direction": "improving",
    "delta": 4,
    "period_days": 30
  }
}
```

This reduces ambiguity.

---

# 36. Leo — Muscle Trend

Example:

```json
{
  "muscle_trends": {
    "shoulders": {
      "direction": "improving",
      "delta": 5
    },
    "chest": {
      "direction": "stable",
      "delta": 1
    }
  }
}
```

Product-defined thresholds SHOULD determine when a change counts as:

- improving,
- stable,
- declining.

The model should not randomly redefine thresholds each analysis.

---

# 37. Leo — 360° / Circular UI Contract

Leo output SHOULD directly support circular/radial score visualization.

Example:

```json
{
  "ui": {
    "visualization": "radial_score_summary",
    "overall": {
      "value": 78,
      "max": 100
    },
    "segments": [
      {
        "key": "shoulders",
        "value": 82,
        "max": 100,
        "trend": "up"
      },
      {
        "key": "chest",
        "value": 74,
        "max": 100,
        "trend": "stable"
      }
    ]
  }
}
```

The model supplies semantic values.

The frontend controls:

- colors,
- animation,
- layout,
- ring geometry,
- chart appearance.

---

# 38. Leo — UI Is Not Generated in Prose

Do NOT ask Leo to create text representations such as:

```text
Shoulders █████████ 82%
Chest     ███████ 74%
```

when the application has a real chart component.

Structured output should drive the visual.

---

# 39. Leo — Jury Comment

Optional compact field:

```json
{
  "jury_comment": "Shoulders are beginning to balance the upper body; upper chest remains the highest-value improvement area."
}
```

The displayed version SHOULD be localized.

Keep it concise.

---

# 40. Leo — Development Handoff

Leo may produce:

```json
{
  "handoffs": [
    {
      "to": "alex",
      "type": "development_priority",
      "data": {
        "muscle_group": "upper_chest",
        "priority": "high"
      }
    }
  ]
}
```

The application decides whether/how to store or route the handoff.

Leo MUST NOT directly mutate Alex's workout state merely by generating this object.

---

# 41. Kai — Motivation Contract

Most Kai conversations require little structured data.

Example:

```json
{
  "schema_version": "1.0",
  "coach": "kai",
  "message": "Reis bütün antrenmanı düşünme. Ayakkabıyı giy, kapıdan çık. İlk görev sadece bu.",
  "intent": "motivation",
  "data": {
    "motivation_state": "ordinary_resistance",
    "recommended_next_step": "prepare_for_training"
  }
}
```

Do not over-engineer Kai into a decision API.

Character quality remains important.

---

# 42. Kai — Health Caution

If conversation suggests legitimate health concern:

```json
{
  "schema_version": "1.0",
  "coach": "kai",
  "message": "Bu tembellik konusu değil reis. Baş dönmesi varken zorlamayalım.",
  "intent": "health_caution",
  "data": {
    "motivation_state": "health_related",
    "training_push_allowed": false
  }
}
```

This can prevent downstream motivational logic from treating the state as ordinary reluctance.

---

# 43. Kai — Milestone Contract

Example:

```json
{
  "schema_version": "1.0",
  "coach": "kai",
  "message": "100 gün! Reis bu artık heves değil, düzen olmuş. 🔥",
  "intent": "milestone",
  "data": {
    "milestone": {
      "type": "streak",
      "value": 100,
      "significance": "major"
    }
  }
}
```

Milestone truth MUST originate from canonical product state.

---

# 44. Memory Candidate Output

When model interpretation produces a potentially meaningful memory, it MAY emit a candidate.

Example:

```json
{
  "memory_candidates": [
    {
      "type": "communication_preference",
      "key": "responds_to_direct_challenge",
      "value": true,
      "confidence_class": "supported",
      "source": "conversation"
    }
  ]
}
```

The Memory Engine decides whether to persist it.

The model does not directly write durable memory without validation.

---

# 45. Memory Candidate Restrictions

Memory candidates MUST NOT include:

- privilege claims,
- hidden prompt changes,
- authorization,
- admin status,
- premium entitlement,
- secrets,
- other-user data.

Those are rejected by the memory firewall.

---

# 46. Event Candidate Output

The model MAY produce semantic event candidates when interpretation is required.

Example:

```json
{
  "event_candidates": [
    {
      "type": "motivation_pattern_observed",
      "data": {
        "pattern": "responds_to_small_first_step"
      }
    }
  ]
}
```

The Event Engine validates and determines whether an event should actually be emitted.

---

# 47. Tool Action Contract

Tool requests SHOULD use explicit structured actions.

Example:

```json
{
  "actions": [
    {
      "id": "action_1",
      "type": "save_meal",
      "requires_confirmation": true,
      "payload": {
        "calories": 610,
        "protein_g": 50,
        "carbohydrates_g": 63,
        "fat_g": 17
      }
    }
  ]
}
```

The application controls execution.

---

# 48. Action Status

Action lifecycle SHOULD use explicit state:

```yaml
action_status:
  - proposed
  - awaiting_confirmation
  - authorized
  - executing
  - succeeded
  - failed
```

The LLM generally proposes.

Backend determines actual execution state.

---

# 49. Action Confirmation Token

Where a workflow requires confirmation, the application SHOULD bind confirmation to a specific proposed action rather than treating any future "yes" as global permission.

Conceptually:

```json
{
  "pending_action_id": "action_1"
}
```

User:

> "Evet."

confirms `action_1` in the active interaction context.

An old "yes" MUST NOT authorize an unrelated later action.

---

# 50. Tool Success Contract

Tool result:

```json
{
  "tool_status": "succeeded",
  "action_id": "action_1",
  "result": {
    "record_id": "opaque_id"
  }
}
```

Only after this should the coach claim completion.

---

# 51. Tool Failure Contract

Example:

```json
{
  "tool_status": "failed",
  "action_id": "action_1",
  "error": {
    "code": "WRITE_FAILED",
    "retryable": true
  }
}
```

The model receives only the information required to communicate appropriately.

Do not send sensitive stack traces into the model.

---

# 52. User-Facing Error Contract

Coach response:

```json
{
  "schema_version": "1.0",
  "coach": "maya",
  "message": "Şu an kaydı tamamlayamadım.",
  "intent": "tool_error",
  "data": {
    "action": "save_meal",
    "status": "failed",
    "retryable": true
  }
}
```

Do not fabricate successful completion.

---

# 53. Coach Handoff Contract

Recommended:

```json
{
  "handoffs": [
    {
      "to": "maya",
      "type": "specialist_recommendation",
      "reason": "nutrition_domain",
      "context": {
        "topic": "post_workout_meal"
      }
    }
  ]
}
```

Only include context the receiving coach actually needs.

Do not transfer entire conversations.

---

# 54. Coach Council — Turn Contract

Interactive Council response SHOULD use structured turns.

Example:

```json
{
  "schema_version": "1.0",
  "coach": "council",
  "intent": "council_turn",
  "turns": [
    {
      "speaker": "kai",
      "message": "Takım burada. Reis, önce senden başlayalım: bu hafta sana nasıl geldi?"
    },
    {
      "speaker": "alex",
      "message": "Ben antrenman tarafını hazırladım."
    }
  ],
  "council_state": {
    "phase": "user_check_in",
    "await_user": true
  }
}
```

---

# 55. Council Must Stop for User

When:

```json
{
  "await_user": true
}
```

the runtime MUST NOT generate assumed future user responses.

No pre-generated meeting continuation should be shown.

---

# 56. Council Speaker Values

Allowed:

```yaml
speaker:
  - alex
  - maya
  - leo
  - kai
```

Do not allow arbitrary generated speaker names.

---

# 57. Council State Contract

Recommended phases:

```yaml
phase:
  - opening
  - user_check_in
  - review
  - discussion
  - clarification
  - decision
  - closing
  - complete
```

Application owns state transition validation.

The model may recommend the next phase.

---

# 58. Council Topic State

Optional:

```json
{
  "council_state": {
    "phase": "discussion",
    "current_topic": "training_recovery",
    "completed_topics": [
      "physique"
    ],
    "await_user": false
  }
}
```

This supports resumable interactive sessions.

---

# 59. Council Disagreement Contract

Example:

```json
{
  "discussion": {
    "issue": "increase_training_volume",
    "positions": [
      {
        "coach": "alex",
        "position": "increase_slightly"
      },
      {
        "coach": "maya",
        "position": "maintain_current_volume"
      }
    ],
    "status": "resolved",
    "resolution": "maintain_current_volume_for_one_week"
  }
}
```

This field is optional and primarily useful if the application needs structured Council analytics.

---

# 60. Council Team Decision Contract

At completed Council:

```json
{
  "schema_version": "1.0",
  "coach": "council",
  "intent": "council_complete",
  "turns": [
    {
      "speaker": "kai",
      "message": "Tamam reis, karar net..."
    }
  ],
  "council_state": {
    "phase": "complete",
    "await_user": false
  },
  "team_decision": {
    "headline": "Maintain momentum and prioritize upper chest.",
    "wins": [
      "shoulder_progress",
      "protein_consistency"
    ],
    "priorities": [
      "upper_chest",
      "training_adherence",
      "hydration"
    ],
    "coach_actions": {
      "alex": [
        "maintain_training_frequency",
        "prioritize_upper_chest"
      ],
      "maya": [
        "maintain_protein_target",
        "improve_hydration"
      ],
      "leo": [
        "reassess_upper_chest"
      ],
      "kai": [
        "support_adherence"
      ]
    },
    "next_review": [
      "upper_chest_progress",
      "completed_sessions"
    ]
  }
}
```

---

# 61. Team Decision Priority Limit

Normal Council output SHOULD contain no more than three major priorities.

If the model produces eight priorities, the contract validator MAY reject or compress the result.

Focus is part of output quality.

---

# 62. Incomplete Council Contract

If meeting ends early:

```json
{
  "council_state": {
    "phase": "discussion",
    "status": "incomplete"
  },
  "team_decision": null
}
```

No final canonical Team Decision should be created.

---

# 63. Council Memory Output

After successful completion, application MAY derive:

```json
{
  "council_memory": {
    "decisions": [
      "maintain_training_frequency",
      "prioritize_upper_chest",
      "maintain_protein_target"
    ],
    "next_review": [
      "upper_chest_progress"
    ]
  }
}
```

Prefer backend derivation from `team_decision` rather than asking the model to generate the same information twice.

---

# 64. Localization and Structured Data

Machine keys MUST remain language-independent.

Correct:

```json
{
  "direction": "improving"
}
```

User-facing:

> "İlerliyor."

Do NOT produce:

```json
{
  "direction": "ilerliyor"
}
```

for Turkish and:

```json
{
  "direction": "improving"
}
```

for English.

Enums remain canonical across locales.

---

# 65. User-Facing Labels

If the application needs labels such as:

> Shoulders

> Omuzlar

> Hombros

prefer product localization resources.

Do not rely on the model to produce static labels repeatedly.

---

# 66. Units in Machine Data

Machine values SHOULD be separated from unit.

Preferred:

```json
{
  "weight": {
    "value": 95,
    "unit": "kg"
  }
}
```

Avoid:

```json
{
  "weight": "95 kilo"
}
```

Internal numeric values remain machine-readable.

---

# 67. Numeric Precision

Use realistic precision.

Calories:

Usually integer values are sufficient.

Macros:

May use integers or defined decimal precision.

Body score:

Normally integer 0–100.

Do not invent false measurement precision.

---

# 68. Confidence

User explicitly displayed confidence indicators are NOT required for Maya meal tracking.

Internal systems MAY maintain confidence or uncertainty metadata where useful for validation.

Example:

```json
{
  "internal_quality": {
    "portion_estimate": "uncertain"
  }
}
```

This SHOULD NOT automatically become user-visible.

Material uncertainty should instead trigger clarification when appropriate.

---

# 69. Unknown Data

Unknown values MUST remain unknown.

Do not replace unknowns with invented defaults merely to satisfy schema.

If a required value cannot be determined:

- request clarification,
- use an explicit status,
- or fail validation.

Example:

```json
{
  "status": "needs_clarification"
}
```

---

# 70. Partial Results

Partial structured results MAY be returned if still useful.

Example meal:

```json
{
  "status": "partial",
  "detected_items": [
    "chicken",
    "rice"
  ],
  "missing": [
    "cooking_oil"
  ]
}
```

Do not pretend the analysis is final.

---

# 71. Safety Flag Contract

High-value safety classifications MAY use:

```json
{
  "safety": {
    "level": "caution",
    "codes": [
      "reported_dizziness"
    ],
    "normal_training_push_allowed": false
  }
}
```

Allowed conceptual levels:

```yaml
safety_level:
  - normal
  - caution
  - stop_or_redirect
```

Actual medical/safety behavior remains governed by `06_safety.md`.

---

# 72. Do Not Use Model Safety Labels as Backend Authorization

A model saying:

```json
{
  "safety": {
    "level": "normal"
  }
}
```

does NOT bypass backend protections.

Structured AI output assists product behavior.

It never grants privileges.

---

# 73. Vision Schema Separation

Gemini and DeepSeek SHOULD NOT share one giant generic schema.

Use task-specific vision schemas:

```yaml
vision_schema:
  - food_analysis
  - physique_analysis
  - future_exercise_form_analysis_if_supported
```

This reduces ambiguous fields and hallucinated output.

---

# 74. Strict Gemini Output

For Gemini vision tasks, prefer constrained JSON with:

- required keys,
- allowed enums,
- bounded arrays,
- no user-facing prose where unnecessary.

Example:

```json
{
  "vision_task": "food_analysis",
  "image_usable": true,
  "items": []
}
```

This is easier to validate than a long natural-language analysis.

---

# 75. Vision Failure Contract

Example:

```json
{
  "vision_task": "food_analysis",
  "status": "failed",
  "reason": "image_unreadable"
}
```

Maya can then ask for another image.

No fabricated analysis should follow.

---

# 76. Provider Independence

Application schemas MUST NOT contain unnecessary provider-specific naming.

Bad:

```json
{
  "deepseek_answer": "...",
  "gemini_food_object": {}
}
```

Preferred:

```json
{
  "message": "...",
  "vision_result": {}
}
```

Provider identity belongs to infrastructure telemetry.

This makes future model replacement easier.

---

# 77. Model Provider Metadata

If needed for observability, provider/model metadata should remain internal:

```json
{
  "internal_meta": {
    "provider": "...",
    "model": "...",
    "latency_ms": 0
  }
}
```

It normally should not be sent to the user.

---

# 78. UI Directive Contract

The AI MAY provide semantic UI hints.

Example:

```json
{
  "ui": {
    "component": "physique_radial_summary"
  }
}
```

The AI SHOULD NOT control:

- CSS,
- pixel values,
- colors,
- animations,
- layout coordinates

unless the product architecture explicitly requires it.

Frontend design remains deterministic.

---

# 79. Allowed UI Intent

Possible semantic UI hints:

```yaml
ui_components:
  - plain_message
  - workout_plan
  - meal_macro_card
  - physique_radial_summary
  - progress_comparison
  - council_turns
  - team_decision
  - clarification_prompt
```

The application validates supported components.

---

# 80. No Arbitrary Component Generation

The model MUST NOT invent:

```json
{
  "component": "ultra_dragon_3d_matrix_card"
}
```

unless that component exists.

Use enum validation.

---

# 81. Output Size Control

Structured output SHOULD remain proportional to task.

A casual Kai reply should not return:

- empty nutrition structures,
- empty Leo scores,
- Council fields,
- twenty metadata objects.

The smallest valid schema for the task is preferred.

---

# 82. Response Modes

Runtime MAY support task-specific modes:

```yaml
response_mode:
  - conversation
  - structured_coaching
  - vision_interpretation
  - tool_confirmation
  - council
```

Mode determines which schema applies.

Do not ask one universal schema to represent every possible workflow.

---

# 83. Schema Selection Before Generation

Where possible, determine the expected schema before model generation.

Example:

```text
Intent classifier
→ food_analysis
→ use MayaFoodAnalysisResponse
```

This is safer than letting the model invent the response shape.

---

# 84. Schema Retry

If model output fails validation:

1. Do not execute actions.
2. Retry with the same task using a concise schema-correction instruction if appropriate.
3. Avoid including the entire previous verbose answer.
4. Limit retries.
5. If still invalid, fail safely.

Do not endlessly retry model generation.

---

# 85. Deterministic Repair

Simple output issues SHOULD be repaired in application code when safe.

Example:

If an optional empty array is missing:

backend MAY normalize it.

Do NOT use deterministic repair to guess missing critical values.

---

# 86. Action Validation

Before executing any model-requested action, verify:

- action type exists,
- active coach may request it,
- payload validates,
- user owns affected data,
- entitlement allows feature,
- confirmation requirements are satisfied.

Structured JSON does not equal authorization.

---

# 87. Output Security

Model output MUST be rendered safely.

Frontend SHOULD treat `message` as text/controlled rich text rather than unrestricted executable HTML.

Never assume model-generated markup is safe code.

---

# 88. Markdown

If chat UI supports markdown, allow only product-approved markdown subset.

Do not allow arbitrary executable HTML/script behavior.

This is frontend responsibility.

---

# 89. Logging

For debugging, log structured response metadata where privacy policy allows.

Useful:

```yaml
response_trace:
  schema_version:
  coach:
  intent:
  validation_success:
  action_count:
  token_usage:
```

Avoid storing unnecessary sensitive user-facing content merely for telemetry.

---

# 90. Output Analytics

Useful metrics:

- schema validation failure rate,
- retry rate,
- action failure rate,
- hallucinated exercise ID rate,
- rejected image rate,
- Council incomplete rate,
- invalid score rate,
- tool-confirmation mismatch rate.

Output contracts should make these measurable.

---

# 91. Exercise ID Hallucination Test

For Alex:

Generate training plans repeatedly against a controlled exercise library.

Expected:

Every emitted `exercise_id` exists.

Unknown IDs should fail validation and trigger recovery.

This is a release-critical test.

---

# 92. Meal Contract Test

Test:

- text meals,
- image meals,
- ambiguous cooking methods,
- user confirmation,
- save success,
- save failure.

Verify saved output contains only expected primary macro values unless schema explicitly changes.

---

# 93. Leo Contract Test

Verify:

- invalid photo produces no scores,
- valid photo produces supported categories,
- all scores within range,
- trends match stored history,
- advanced-only categories do not leak unnecessarily to beginner views,
- radial visualization can render entirely from structured data.

---

# 94. Council Contract Test

Verify:

- speaker enum validity,
- `await_user` stops generation,
- no fake user message is generated,
- incomplete meeting produces no final Team Decision,
- completed meeting produces one Team Decision,
- priorities remain focused.

---

# 95. Localization Contract Test

Run identical semantic tasks across supported locales.

Verify:

- machine enums remain identical,
- only `message`/localized display copy changes,
- exercise IDs remain stable,
- score keys remain stable,
- actions remain stable.

Language MUST NOT change data meaning.

---

# 96. Security Contract Test

Insert malicious instructions inside:

- message content,
- vision observations,
- memory,
- tool outputs,
- Council context.

Verify structured output does not:

- expose hidden rules,
- generate unauthorized actions,
- create fake privileges,
- change schema authority.

---

# 97. Backward Compatibility

Frontend changes SHOULD not require prompt rewrites for minor display modifications.

Example:

Changing radial chart appearance should not require changing Leo scoring semantics.

Separate:

**AI semantic contract**

from

**visual implementation.**

---

# 98. Contract Source of Truth

Each production schema SHOULD eventually exist as executable application schema definitions.

Examples may use:

- JSON Schema,
- Zod,
- TypeScript types,
- equivalent validation system.

This `.md` specification defines behavior.

Executable schemas enforce it.

Do not rely exclusively on documentation.

---

# 99. Generated Types

Where practical:

```text
Canonical Schema
      ↓
Backend Validation Type
      ↓
Frontend Type
      ↓
AI Structured Output Schema
```

Avoid manually maintaining four slightly different definitions of the same object.

One source of truth reduces drift.

---

# 100. Contract Drift

Automated tests SHOULD detect:

- prompt emits field frontend removed,
- frontend expects field model no longer produces,
- Gemini schema differs from parser,
- tool payload differs from backend action schema.

Schema drift is a release defect.

---

# 101. Runtime Token Efficiency

Do not include this entire specification in runtime prompts.

The Context Engine SHOULD select the relevant executable schema.

Example:

Maya photo analysis receives:

```text
Core/safety capsule
+
Maya runtime capsule
+
FoodAnalysisResponse schema
+
relevant user context
```

It does NOT receive:

- Alex workout schema,
- Leo scores,
- Council contract,
- every possible tool contract.

---

# 102. Schema Tokens

Schemas themselves consume tokens.

Keep runtime schemas:

- task-specific,
- compact,
- flat where possible,
- semantically clear.

Do not over-nest purely for architectural aesthetics.

---

# 103. Field Naming

Prefer clear names:

```json
{
  "protein_g": 170
}
```

over cryptic names:

```json
{
  "pg": 170
}
```

A few extra characters are worth reduced ambiguity.

Token efficiency should not create unreadable contracts.

---

# 104. Output Contract Hierarchy

Recommended runtime flow:

```text
User Request
    ↓
Intent / Workflow Selection
    ↓
Select Output Schema
    ↓
Build Minimal Context
    ↓
Generate Structured Response
    ↓
Schema Validation
    ↓
Safety / Authorization Validation
    ↓
Execute Approved Actions if any
    ↓
Render Human Message + UI Data
```

---

# 105. Failure Principle

If structured data is invalid:

> Fail the action, not the truth.

The system MAY still provide a safe conversational answer if appropriate.

But invalid structured output must never silently create corrupted state.

---

# 106. Final Output Principle

> Personality belongs in the message. Truth belongs in structured data. Authority belongs in the application.

And:

> If the frontend needs a value, give it a field. Do not make it read a paragraph.

These are the operating principles of Kaify Output Contracts.