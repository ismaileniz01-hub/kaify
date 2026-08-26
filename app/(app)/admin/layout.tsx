import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminDecoy } from "@/components/admin/AdminDecoy";
import { AdminHubGate } from "@/components/admin/AdminHubGate";
import { resolveIsHubAdmin } from "@/lib/auth/admin-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await resolveIsHubAdmin(user.id))) {
    return <AdminDecoy />;
  }

  return <AdminHubGate>{children}</AdminHubGate>;
}
