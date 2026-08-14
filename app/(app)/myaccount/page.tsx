import type { Metadata } from "next";
import { MyAccountPage } from "@/components/account/MyAccountPage";

export const metadata: Metadata = {
  title: "My Account — Kaify Ai",
  description: "Manage your Kaify Ai profile, photo, and account details.",
};

export default function MyAccountRoute() {
  return <MyAccountPage />;
}
