import { NextRequest } from "next/server";
import { waitlistSchema } from "@/lib/api-security";
import { handleSenderSubscribe } from "@/lib/marketing/sender";

/**
 * POST /api/waitlist — public Sender.net subscription (shared handler).
 */
export async function POST(request: NextRequest) {
  return handleSenderSubscribe(request, "api/waitlist", waitlistSchema);
}
