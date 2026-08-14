import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundView />;
}
