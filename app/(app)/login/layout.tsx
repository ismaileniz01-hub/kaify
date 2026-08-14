import type { ReactNode } from "react";
import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = publicPageMetadata({
  title: "Sign in — Kaify Ai",
  description: "Sign in to Kaify Ai with an email code. Your coaching team is waiting.",
  path: "/login",
  index: false,
});

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
