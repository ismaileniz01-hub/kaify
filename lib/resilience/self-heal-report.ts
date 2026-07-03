import { getDeepSeekConfig } from "@/lib/ai/env";
import { createChatCompletion } from "@/lib/ai/deepseek.client";
import { getCircuitSnapshots } from "@/lib/resilience/circuit";
import { getDegradedState } from "@/lib/resilience/degraded-mode";
import { getErrorMonitorSnapshot } from "@/lib/resilience/error-monitor";
import type { ChatTurn } from "@/lib/ai/types";

export type SelfHealSnapshot = {
  timestamp: string;
  degraded: Awaited<ReturnType<typeof getDegradedState>>;
  circuits: ReturnType<typeof getCircuitSnapshots>;
  errorCounters: Awaited<ReturnType<typeof getErrorMonitorSnapshot>>;
  aiReport: string | null;
};

export async function buildSelfHealSnapshot(options?: {
  includeAiReport?: boolean;
}): Promise<SelfHealSnapshot> {
  const [degraded, errorCounters] = await Promise.all([
    getDegradedState(),
    getErrorMonitorSnapshot(),
  ]);

  const snapshot: SelfHealSnapshot = {
    timestamp: new Date().toISOString(),
    degraded,
    circuits: getCircuitSnapshots(),
    errorCounters,
    aiReport: null,
  };

  if (options?.includeAiReport) {
    snapshot.aiReport = await generateSelfHealReport(snapshot);
  }

  return snapshot;
}

async function generateSelfHealReport(snapshot: SelfHealSnapshot): Promise<string | null> {
  try {
    getDeepSeekConfig();
  } catch {
    return "AI raporu üretilemedi: DeepSeek yapılandırılmamış.";
  }

  const context = JSON.stringify(
    {
      degraded: snapshot.degraded,
      circuits: snapshot.circuits,
      errorCounters: snapshot.errorCounters,
    },
    null,
    2,
  );

  const messages: ChatTurn[] = [
    {
      role: "system",
      content:
        "You are a senior SRE reviewing production telemetry for a fitness app backend. " +
        "Given JSON telemetry, write a concise Turkish report with: (1) likely root cause, " +
        "(2) user impact, (3) recommended fix steps for a human engineer. " +
        "Do NOT suggest auto-deploying code. Max 12 bullet points.",
    },
    {
      role: "user",
      content: `Telemetry:\n${context}`,
    },
  ];

  try {
    const { content } = await createChatCompletion(messages, {
      temperature: 0.2,
      maxTokens: 600,
      usageContext: { operation: "self_heal_report" },
    });
    return content.trim();
  } catch {
    return "AI raporu üretilemedi (upstream hatası).";
  }
}
