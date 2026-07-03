import { NextRequest } from "next/server";
import { subscribeSchema } from "@/lib/api-security";
import { handleSenderSubscribe } from "@/lib/marketing/sender";

/**
 * POST /api/subscribe — public Sender.net subscription (shared handler).
 */
export async function POST(request: NextRequest) {
  return handleSenderSubscribe(request, "api/subscribe", subscribeSchema);
}
