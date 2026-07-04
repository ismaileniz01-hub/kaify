import type { AnalyticsDailyDTO } from "@/lib/services/analytics.service";

/** Rule-based Kai food insight — no LLM. */
export function buildKaiFoodInsight(
  today: AnalyticsDailyDTO | null | undefined,
  locale: string,
): string | null {
  if (!today || today.caloriesConsumed <= 0) return null;

  const tr = locale.startsWith("tr");
  const calPct = today.calorieGoal > 0 ? today.caloriesConsumed / today.calorieGoal : 0;
  const proteinPct =
    today.proteinGoalG > 0 ? today.proteinG / today.proteinGoalG : 0;

  if (calPct >= 1.15) {
    return tr
      ? `Bugün ${today.caloriesConsumed} kcal kaydettin — hedefin biraz üstündesin. Akşam hafif bir yürüyüş Kai'yi mutlu eder.`
      : `You logged ${today.caloriesConsumed} kcal today — slightly above goal. A light evening walk would make Kai happy.`;
  }

  if (calPct >= 0.85 && proteinPct >= 0.8) {
    return tr
      ? `Harika denge! ${today.proteinG}g protein aldın — kasların teşekkür ediyor.`
      : `Great balance! ${today.proteinG}g protein logged — your muscles thank you.`;
  }

  if (proteinPct < 0.5 && today.caloriesConsumed > 400) {
    return tr
      ? `${today.caloriesConsumed} kcal var ama protein ${today.proteinG}g — bir sonraki öğünde 25g+ protein eklemeyi dene.`
      : `${today.caloriesConsumed} kcal so far but only ${today.proteinG}g protein — aim for 25g+ at your next meal.`;
  }

  if (calPct < 0.35 && today.caloriesConsumed > 0) {
    return tr
      ? `Bugün ${today.caloriesConsumed} kcal — henüz erken. Maya ile öğle yemeğini fotoğrafla, Kai takip etsin.`
      : `${today.caloriesConsumed} kcal so far — still early. Snap lunch with Maya so Kai can track it.`;
  }

  if (calPct >= 0.5 && calPct < 0.85) {
    return tr
      ? `Günün yarısındasın: ${today.caloriesConsumed}/${today.calorieGoal} kcal. Tempo güzel, böyle devam!`
      : `Midday check: ${today.caloriesConsumed}/${today.calorieGoal} kcal. Nice pace — keep it up!`;
  }

  return tr
    ? `Bugün ${today.caloriesConsumed} kcal kaydettin. Kai seni izliyor — tutarlılık kazandırır.`
    : `${today.caloriesConsumed} kcal logged today. Kai is watching — consistency wins.`;
}
