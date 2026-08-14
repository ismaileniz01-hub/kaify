import type { ReactNode } from "react";
import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = publicPageMetadata({
  title: "Create account — K.AIFY",
  description: "Create a K.AIFY account and meet your four coaches.",
  path: "/signup",
  index: false,
});

export default function SignupLayout({ children }: { children: ReactNode }) {
  return children;
}
