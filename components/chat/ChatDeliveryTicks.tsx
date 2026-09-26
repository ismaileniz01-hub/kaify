"use client";

import { Check } from "lucide-react";
import type { MessageDeliveryStatus } from "@/lib/chat/message-lifecycle";
import { useLang } from "@/lib/lang-context";

export function ChatDeliveryTicks({ status }: { status?: MessageDeliveryStatus }) {
  const { t } = useLang();
  if (status === "failed" || !status) return null;

  const label =
    status === "sending" ? t("chat.message.sending") : t("chat.message.delivered");

  return (
    <span className="chat-delivery" aria-label={label} title={label}>
      <Check
        className={`chat-delivery__tick ${status === "sending" ? "chat-delivery__tick--pending" : ""}`}
        aria-hidden
      />
      {status === "delivered" ? (
        <Check className="chat-delivery__tick chat-delivery__tick--second" aria-hidden />
      ) : null}
    </span>
  );
}
