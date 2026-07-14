import { ApiError } from "@/lib/api/errors";
import {
  checkAndIncrementUsage,
  refundUsage,
} from "@/lib/services/usage-limit.service";
import type { UsageCheckResult, UsageResource } from "@/lib/types/database.types";

/** Minimum tokens reserved atomically before a chat stream starts. */
export const CHAT_TOKEN_RESERVE = 500;

function quotaMessage(resource: UsageResource): string {
  switch (resource) {
    case "text_tokens":
      return "Aylık mesaj limitin doldu. Devam etmek için planını yükseltebilirsin.";
    case "maya_photo":
      return "Günlük fotoğraf analiz hakkın doldu. Yarın tekrar deneyebilir ya da planını yükseltebilirsin.";
    case "leo_photo":
      return "Haftalık fotoğraf analiz hakkın doldu. Planını yükselterek devam edebilirsin.";
    default:
      return "Kullanım limitin doldu.";
  }
}

function assertAllowed(result: UsageCheckResult, resource: UsageResource): void {
  if (!result.allowed) {
    throw new ApiError("FORBIDDEN", quotaMessage(resource), {
      warning_trigger: result.warning_trigger ?? "LIMIT_100",
      resource: result.resource,
      used: result.used,
      limit: result.limit,
    });
  }
}

export type QuotaParams = {
  userId: string;
  resource: UsageResource;
};

/** Read-only quota probe (amount=0). Prefer reserveQuota for AI routes. */
export async function checkQuotaGuard(
  params: QuotaParams,
): Promise<UsageCheckResult> {
  const result = await checkAndIncrementUsage({
    userId: params.userId,
    resource: params.resource,
    amount: 0,
  });
  assertAllowed(result, params.resource);
  return result;
}

/**
 * Atomically reserves quota before an AI call.
 * Prevents concurrent requests from bypassing limits (TOCTOU fix).
 */
export async function reserveQuota(params: {
  userId: string;
  resource: UsageResource;
  amount: number;
}): Promise<UsageCheckResult> {
  const result = await checkAndIncrementUsage({
    userId: params.userId,
    resource: params.resource,
    amount: params.amount,
  });
  assertAllowed(result, params.resource);
  return result;
}

/** Records additional consumption after a reservation (e.g. actual token count).
 * Caps to remaining quota so settle never silently drops overages under a soft deny.
 */
export async function settleQuota(params: {
  userId: string;
  resource: UsageResource;
  amount: number;
}): Promise<UsageCheckResult | null> {
  if (params.amount <= 0) return null;

  const probe = await checkAndIncrementUsage({
    userId: params.userId,
    resource: params.resource,
    amount: 0,
  });
  const room = Math.max(0, Number(probe.remaining ?? 0));
  const amount = Math.min(params.amount, room);
  if (amount <= 0) {
    // Already at cap — keep the reserved portion counted; do not pretend settle failed.
    return { ...probe, allowed: true };
  }

  const result = await checkAndIncrementUsage({
    userId: params.userId,
    resource: params.resource,
    amount,
  });
  // Cap means extras beyond hard limit are truncated, not a hard abort after AI work.
  return { ...result, allowed: true };
}

/** Increments usage without a prior reservation (e.g. team chat). */
export async function consumeQuota(params: {
  userId: string;
  resource: UsageResource;
  amount: number;
}): Promise<UsageCheckResult> {
  return checkAndIncrementUsage({
    userId: params.userId,
    resource: params.resource,
    amount: params.amount,
  });
}

/** Returns reserved quota when an AI call fails after reservation. */
export async function refundQuota(params: {
  userId: string;
  resource: UsageResource;
  amount: number;
}): Promise<void> {
  if (params.amount <= 0) return;
  await refundUsage(params);
}
