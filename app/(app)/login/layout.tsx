import type { ReactNode } from "react";
import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = publicPageMetadata({
  title: "Sign in — K.AIFY",
  description: "Sign in to K.AIFY with an email code. Your coaching team is waiting.",
  path: "/login",
  index: false,
});

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
