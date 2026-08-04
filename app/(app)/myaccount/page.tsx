import type { Metadata } from "next";
import { MyAccountPage } from "@/components/account/MyAccountPage";

export const metadata: Metadata = {
  title: "My Account — K.AIFY",
  description: "Manage your K.AIFY profile, photo, and account details.",
};

export default function MyAccountRoute() {
  return <MyAccountPage />;
}
