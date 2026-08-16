/**
 * KAIOS capsule loader — selects concise runtime capsules per coach/task.
 * Never loads full source markdown.
 */

import { CORE_CAPSULE } from "@/lib/kaios/capsules/core";
import { SAFETY_CAPSULE } from "@/lib/kaios/capsules/safety";
import {
  LOCALIZATION_CAPSULE,
  getLocalePack,
} from "@/lib/kaios/capsules/localization";
import { selectAlexCapsules } from "@/lib/kaios/capsules/alex";
import { selectMayaCapsules } from "@/lib/kaios/capsules/maya";
import { selectLeoCapsules } from "@/lib/kaios/capsules/leo";
import { selectKaiCapsules } from "@/lib/kaios/capsules/kai";
import { selectCouncilCapsules } from "@/lib/kaios/capsules/council";
import type { CoachId, Intent } from "@/lib/kaios/routing/intent";

export { CORE_CAPSULE } from "@/lib/kaios/capsules/core";
export { SAFETY_CAPSULE } from "@/lib/kaios/capsules/safety";
export {
  LOCALIZATION_CAPSULE,
  getLocalePack,
} from "@/lib/kaios/capsules/localization";
export {
  ALEX_CORE,
  ALEX_FORM,
  ALEX_PROGRAMMING,
  ALEX_MOTIVATION,
  ALEX_SAFETY,
  selectAlexCapsules,
} from "@/lib/kaios/capsules/alex";
export {
  MAYA_CORE,
  MAYA_FOOD_ANALYSIS,
  MAYA_MEAL_PLANNING,
  MAYA_HYDRATION,
  MAYA_SAFETY,
  selectMayaCapsules,
} from "@/lib/kaios/capsules/maya";
export {
  LEO_CORE,
  LEO_IMAGE_QUALITY,
  LEO_SCORING,
  LEO_TREND,
  LEO_POSTURE,
  selectLeoCapsules,
} from "@/lib/kaios/capsules/leo";
export {
  KAI_CORE,
  KAI_MOTIVATION,
  KAI_EMOTIONAL,
  KAI_CELEBRATION,
  KAI_MODE_COUNCIL,
  KAI_MODE_CONTINUATION,
  KAI_MODE_RESISTANCE,
  selectKaiCapsules,
} from "@/lib/kaios/capsules/kai";
export {
  COUNCIL_CORE,
  COUNCIL_ROLE_DIGESTS,
  selectCouncilCapsules,
} from "@/lib/kaios/capsules/council";

export type KaiosCoach = "alex" | "maya" | "leo" | "kai" | "council";

/** Map routing intents onto coach capsule task keys. */
export function intentToCapsuleTask(intent: Intent): string {
  switch (intent) {
    case "exercise_form":
      return "form";
    case "meal_analysis":
      return "food_analysis";
    case "meal_plan":
      return "meal_planning";
    case "physique_analysis":
      return "scoring";
    case "council_turn":
      return "turn";
    case "council_decision":
      return "decision";
    case "nutrition_question":
      return "meal_planning";
    case "tool_action":
      return "casual";
    default:
      return intent;
  }
}

/**
 * Active coach + task capsules only (CORE / SAFETY / locale applied in compiler).
 * Optional message selects conditional modes (memory continuity, health).
 */
export function selectActiveCapsules(
  coach: CoachId,
  intent: Intent,
  message?: string,
): string[] {
  let task = intentToCapsuleTask(intent);
  const msg = message ?? "";
  if (
    /\b(hatırlıyor|hatirliyor|remember|geçen hafta|gecen hafta|last week|demiştin|demistin)\b/i.test(
      msg,
    )
  ) {
    task = `${task}+memory`;
  }
  if (
    /\b(fever|ateş|ates|hasta|hastayım|hastayim|injured|injury|sakat|verletzt)\b/i.test(
      msg,
    )
  ) {
    task = `${task}+health`;
  }
  if (
    /\b(feel|feeling|hissediyorum|üzgün|mutsuz|emotional|kendimi kötü)\b/i.test(
      msg,
    )
  ) {
    task = `${task}+emotional`;
  }
  if (
    /\b(celebrat|personal record|\bpr\b|milestone|başardım|basardim)\b/i.test(
      msg,
    )
  ) {
    task = `${task}+celebration`;
  }
  if (
    /\b(sadece konuş|just talk|don't coach|dont coach|koçluk yapma|kocluk yapma)\b/i.test(
      msg,
    )
  ) {
    task = `${task}+casual`;
  }
  if (/\+continuation\b/i.test(msg)) {
    task = `${task}+continuation`;
  }
  switch (coach) {
    case "alex":
      return selectAlexCapsules(task);
    case "maya":
      return selectMayaCapsules(task);
    case "leo":
      return selectLeoCapsules(task);
    case "kai":
      return selectKaiCapsules(task);
    case "council":
      return selectCouncilCapsules(task);
    default:
      return [];
  }
}

/** @deprecated Prefer selectActiveCapsules; kept for capsule unit tests. */
export function coachCapsules(coach: CoachId): string[] {
  return selectActiveCapsules(coach, "casual");
}

/**
 * Load shared core/safety/locale capsules plus coach-specific task capsules.
 */
export function loadCoachCapsules(
  coach: KaiosCoach | string,
  task: string,
  locale?: string,
): string[] {
  const shared = [SAFETY_CAPSULE, CORE_CAPSULE, LOCALIZATION_CAPSULE];
  if (locale) shared.push(getLocalePack(locale));

  switch (coach) {
    case "alex":
      return [...shared, ...selectAlexCapsules(task)];
    case "maya":
      return [...shared, ...selectMayaCapsules(task)];
    case "leo":
      return [...shared, ...selectLeoCapsules(task)];
    case "kai":
      return [...shared, ...selectKaiCapsules(task)];
    case "council":
      return [...shared, ...selectCouncilCapsules(task)];
    default:
      return shared;
  }
}
